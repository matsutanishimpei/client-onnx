import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  preprocessImage,
  drawSegmentationResults,
  MODEL_INPUT_SIZE,
  type SegResult,
} from '../lib/yoloSeg';
import { COCO_LABELS, getClassColor, getClassColorSolid } from '../lib/cocoLabels';
import { YoloWorkerClient } from '../lib/yoloWorkerClient';
import client from '../lib/hc';
import { useToast } from '../components/Toast';

interface Props {
  onNavigate: (page: string) => void;
}

type Status = 'idle' | 'requesting-camera' | 'loading-model' | 'running' | 'stopped' | 'error';
type Backend = 'webgpu' | 'wasm' | 'detecting';

/**
 * リアルタイムカメラ セグメンテーションページ
 * WebGPU 優先 → WASM フォールバック
 */
const RealtimeCameraPage: React.FC<Props> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [status, setStatus] = useState<Status>('idle');
  const [backend, setBackend] = useState<Backend>('detecting');
  const [error, setError] = useState('');
  const [fps, setFps] = useState(0);
  const [confThreshold, setConfThreshold] = useState(0.3);
  const [detectionCount, setDetectionCount] = useState(0);
  const [inferenceTime, setInferenceTime] = useState(0);
  const [postprocessTime, setPostprocessTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const ortRef = useRef<any>(null);
  const workerClientRef = useRef<YoloWorkerClient | null>(null);
  const runningRef = useRef(false);
  const processingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const fpsTimesRef = useRef<number[]>([]);
  const lastResultRef = useRef<SegResult | null>(null);
  const confRef = useRef(confThreshold);

  // confThreshold の ref を最新値に保つ
  useEffect(() => {
    confRef.current = confThreshold;
  }, [confThreshold]);

  /** WebGPU が利用可能か検出 */
  const detectWebGPU = useCallback(async (): Promise<boolean> => {
    try {
      if (!navigator.gpu) return false;
      const adapter = await navigator.gpu.requestAdapter();
      return !!adapter;
    } catch {
      return false;
    }
  }, []);

  /** ORT モジュールの初期化 (WebGPU 優先) */
  const initOrt = useCallback(async () => {
    const hasWebGPU = await detectWebGPU();
    
    let ort: any;
    if (hasWebGPU) {
      try {
        // WebGPU 対応版をインポート
        ort = await import('onnxruntime-web/webgpu');
        setBackend('webgpu');
      } catch {
        // フォールバック: 通常版
        ort = await import('onnxruntime-web');
        setBackend('wasm');
      }
    } else {
      ort = await import('onnxruntime-web');
      setBackend('wasm');
    }

    // CDN から WASM ファイルを読み込む
    const version = (ort.env as any).versions?.web ?? '1.24.3';
    ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${version}/dist/`;

    ortRef.current = ort;
    return { ort, hasWebGPU };
  }, [detectWebGPU]);

  /** カメラを起動 */
  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    // 既存ストリーム停止
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facing,
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    });

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  }, []);

  /** 推論ループ */
  const inferenceLoop = useCallback(async () => {
    if (!runningRef.current) return;
    if (processingRef.current) {
      requestAnimationFrame(() => inferenceLoop());
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const session = sessionRef.current;
    const ort = ortRef.current;

    if (!video || !canvas || !overlayCanvas || !session || !ort) {
      requestAnimationFrame(() => inferenceLoop());
      return;
    }

    if (video.readyState < 2) {
      requestAnimationFrame(() => inferenceLoop());
      return;
    }

    processingRef.current = true;
    const frameStart = performance.now();

    try {
      // 1. ビデオフレーム取得 → canvas
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, vw, vh);

      // 2. 前処理
      const [tensorData, scale, padX, padY] = preprocessImage(canvas as any);

      // 3. 推論
      const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);
      const t0 = performance.now();
      const results = await session.run({ images: inputTensor });
      const inferMs = performance.now() - t0;
      setInferenceTime(inferMs);

      // 4. 後処理 (Web Worker に移譲)
      const tPost0 = performance.now();
      const output0 = results['output0'].data as Float32Array;
      const output1 = results['output1'].data as Float32Array;

      // workerClient がない場合はメインスレッドでフォールバック (基本はあり)
      let segResult: SegResult;
      if (workerClientRef.current) {
        segResult = await workerClientRef.current.postprocess(
          output0,
          output1,
          confRef.current,
          0.45,
          COCO_LABELS
        );
      } else {
        // フォールバック用の import が必要になるため、基本は worker を使う
        // ここではランタイムエラー回避のため型定義のみ
        throw new Error('Worker client is not initialized');
      }
      
      const postMs = performance.now() - tPost0;
      setPostprocessTime(postMs);
      setDetectionCount(segResult.detections.length);
      lastResultRef.current = segResult;

      // 5. 描画
      // canvas にビデオフレームが描画済みなので、それをベースに overlay に結果を描画
      const imgForDraw = new Image();
      imgForDraw.width = vw;
      imgForDraw.height = vh;

      // canvas から直接 overlay に描画
      overlayCanvas.width = vw;
      overlayCanvas.height = vh;
      const overlayCtx = overlayCanvas.getContext('2d')!;
      overlayCtx.clearRect(0, 0, vw, vh);
      overlayCtx.drawImage(canvas, 0, 0);

      // セグメンテーション結果をオーバーレイ
      drawSegmentationOnCanvas(overlayCtx, segResult, scale, padX, padY, vw, vh);

      // FPS 計算
      const now = performance.now();
      fpsTimesRef.current.push(now);
      // 直近 1 秒間のフレーム数
      while (fpsTimesRef.current.length > 0 && fpsTimesRef.current[0] < now - 1000) {
        fpsTimesRef.current.shift();
      }
      setFps(fpsTimesRef.current.length);

    } catch (e) {
      console.error('Inference error:', e);
    }

    processingRef.current = false;

    if (runningRef.current) {
      requestAnimationFrame(() => inferenceLoop());
    }
  }, []);

  /** セグメンテーション結果を canvas に直接描画 (Image不使用) */
  const drawSegmentationOnCanvas = (
    ctx: CanvasRenderingContext2D,
    result: SegResult,
    scale: number,
    padX: number,
    padY: number,
    imgW: number,
    imgH: number,
  ) => {
    const MASK_SIZE = 160;
    const { detections, masks } = result;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = MASK_SIZE;
    maskCanvas.height = MASK_SIZE;
    const maskCtx = maskCanvas.getContext('2d')!;

    for (let d = 0; d < detections.length; d++) {
      const det = detections[d];
      const mask = masks[d];

      // マスク画像を作成
      const maskImageData = maskCtx.createImageData(MASK_SIZE, MASK_SIZE);
      const hue = (det.classId * 137.5) % 360;
      const [r, g, b] = hslToRgb(hue / 360, 0.75, 0.55);

      for (let i = 0; i < MASK_SIZE * MASK_SIZE; i++) {
        const alpha = mask[i] > 0.5 ? 100 : 0;
        maskImageData.data[i * 4] = r;
        maskImageData.data[i * 4 + 1] = g;
        maskImageData.data[i * 4 + 2] = b;
        maskImageData.data[i * 4 + 3] = alpha;
      }
      maskCtx.putImageData(maskImageData, 0, 0);

      // マスクを元画像座標にマッピング
      const maskToImgScale = (MODEL_INPUT_SIZE / MASK_SIZE) / scale;
      ctx.drawImage(
        maskCanvas,
        0, 0, MASK_SIZE, MASK_SIZE,
        -padX / scale, -padY / scale,
        MASK_SIZE * maskToImgScale, MASK_SIZE * maskToImgScale,
      );

      // バウンディングボックス
      const bx1 = (det.x1 - padX) / scale;
      const by1 = (det.y1 - padY) / scale;
      const bx2 = (det.x2 - padX) / scale;
      const by2 = (det.y2 - padY) / scale;
      const bw = bx2 - bx1;
      const bh = by2 - by1;

      ctx.strokeStyle = getClassColorSolid(det.classId);
      ctx.lineWidth = 2;
      ctx.strokeRect(bx1, by1, bw, bh);

      // ラベル
      const label = `${det.className} ${(det.score * 100).toFixed(0)}%`;
      const fontSize = Math.max(12, imgW / 50);
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      const textW = ctx.measureText(label).width;
      const textH = fontSize + 4;

      ctx.fillStyle = getClassColorSolid(det.classId);
      ctx.fillRect(bx1, by1 - textH - 2, textW + 8, textH + 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, bx1 + 4, by1 - 5);
    }
  };

  /** 開始 */
  const handleStart = useCallback(async () => {
    setError('');
    try {
      // 1. カメラ起動
      setStatus('requesting-camera');
      await startCamera(cameraFacing);

      // 2. ORT 初期化
      setStatus('loading-model');
      const { ort, hasWebGPU } = await initOrt();

      // 3. セッション作成
      const eps = hasWebGPU ? ['webgpu', 'wasm'] : ['wasm'];
      sessionRef.current = await ort.InferenceSession.create('/yolov8n-seg.onnx', {
        executionProviders: eps,
      });

      // 4. Worker 初期化
      if (!workerClientRef.current) {
        workerClientRef.current = new YoloWorkerClient();
      }

      // 5. ループ開始
      setStatus('running');
      runningRef.current = true;
      fpsTimesRef.current = [];
      requestAnimationFrame(() => inferenceLoop());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
    }
  }, [cameraFacing, startCamera, initOrt, inferenceLoop]);

  /** 停止 */
  const handleStop = useCallback(() => {
    runningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    sessionRef.current = null;
    
    if (workerClientRef.current) {
      workerClientRef.current.terminate();
      workerClientRef.current = null;
    }

    setStatus('stopped');
    setFps(0);
    lastResultRef.current = null;
  }, []);

  /** 現在の結果を DB に保存する */
  const handleSave = useCallback(async () => {
    if (!lastResultRef.current || isSaving) return;
    
    setIsSaving(true);
    try {
      const res = await client.api.detections.$post({
        json: lastResultRef.current as any
      });
      
      if (res.ok) {
        showToast('履歴に保存しました', 'success');
      } else {
        showToast('保存に失敗しました', 'error');
      }
    } catch (err) {
      showToast('通信エラーが発生しました', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving]);

  /** カメラ切り替え */
  const handleFlipCamera = useCallback(async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);
    if (status === 'running') {
      await startCamera(newFacing);
    }
  }, [cameraFacing, status, startCamera]);

  // アンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (workerClientRef.current) {
        workerClientRef.current.terminate();
      }
    };
  }, []);

  const isRunning = status === 'running';
  const isLoading = status === 'requesting-camera' || status === 'loading-model';

  return (
    <div className="app-container app-container--wide">
      <header className="header fade-in">
        <button className="back-btn" onClick={() => { handleStop(); onNavigate('home'); }}>
          ← ホームに戻る
        </button>
        <div className="header__badge header__badge--live">
          {isRunning && <span className="live-dot" />}
          Real-time Camera Segmentation
        </div>
        <h1 className="header__title">リアルタイム検出</h1>
        <p className="header__subtitle">
          カメラ映像から YOLOv8n-seg でリアルタイムにインスタンスセグメンテーション。
          {backend === 'webgpu' ? 'WebGPU で高速推論中' : backend === 'wasm' ? 'WASM バックエンドで推論中' : 'バックエンド検出中...'}
        </p>
      </header>

      {/* HUD：FPS & メトリクス */}
      {isRunning && (
        <div className="hud fade-in">
          <div className="hud__item hud__item--fps">
            <div className="hud__value">{fps}</div>
            <div className="hud__label">FPS</div>
          </div>
          <div className="hud__item">
            <div className="hud__value">{inferenceTime.toFixed(0)}</div>
            <div className="hud__label">推論 ms</div>
          </div>
          <div className="hud__item" title="Web Worker による後処理時間">
            <div className="hud__value">{postprocessTime.toFixed(0)}</div>
            <div className="hud__label">後処理 ms</div>
          </div>
          <div className="hud__item">
            <div className="hud__value">{detectionCount}</div>
            <div className="hud__label">検出数</div>
          </div>
          <button 
            className={`hud__item hud__item--action ${isSaving ? 'hud__item--loading' : ''}`}
            onClick={handleSave}
            disabled={status !== 'running' || detectionCount === 0 || isSaving}
            title="現在の結果を保存"
          >
            <div className="hud__value">{isSaving ? '...' : '💾'}</div>
            <div className="hud__label">保存</div>
          </button>
          <div className={`hud__item hud__item--backend ${backend === 'webgpu' ? 'hud__item--gpu' : ''}`}>
            <div className="hud__value">{backend === 'webgpu' ? 'GPU' : 'CPU'}</div>
            <div className="hud__label">{backend.toUpperCase()}</div>
          </div>
        </div>
      )}

      {/* カメラ映像 + オーバーレイ */}
      <section className="card fade-in fade-in-delay-1">
        <div className="camera-viewport">
          {/* 非表示のビデオ & 作業用 canvas */}
          <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* 結果表示用 canvas */}
          {(isRunning || status === 'stopped') ? (
            <canvas ref={overlayCanvasRef} className="camera-canvas" />
          ) : (
            <div className="camera-placeholder">
              <div className="camera-placeholder__icon">📹</div>
              <div className="camera-placeholder__text">
                {isLoading ? '起動中...' : 'カメラを起動してください'}
              </div>
            </div>
          )}
        </div>

        {/* コントロール */}
        <div className="camera-controls">
          {!isRunning ? (
            <button
              id="start-camera-btn"
              className="btn btn--primary btn--lg"
              onClick={handleStart}
              disabled={isLoading}
            >
              {isLoading ? (
                <><span className="spinner" /> {status === 'requesting-camera' ? 'カメラ起動中...' : 'モデル読込中...'}</>
              ) : (
                <>▶ 検出開始</>
              )}
            </button>
          ) : (
            <button
              id="stop-camera-btn"
              className="btn btn--danger btn--lg"
              onClick={handleStop}
            >
              ■ 停止
            </button>
          )}

          <button
            className="btn btn--outline"
            onClick={handleFlipCamera}
            title="カメラ切替 (前面/背面)"
          >
            🔄 カメラ切替
          </button>
        </div>

        {/* 信頼度閾値 */}
        <div className="threshold-control">
          <label className="threshold-label">
            信頼度閾値: <strong>{confThreshold.toFixed(2)}</strong>
          </label>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.05"
            value={confThreshold}
            onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
            className="threshold-slider"
          />
        </div>

        {/* ステータス / エラー */}
        {status === 'error' && (
          <div className="status-bar status-bar--error" style={{ marginTop: '1rem' }}>
            ❌ {error}
          </div>
        )}
      </section>

      {/* 情報 */}
      <section className="card fade-in fade-in-delay-2">
        <div className="card__header">
          <div className="card__icon card__icon--primary">ℹ️</div>
          <h2 className="card__title">使い方</h2>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-item__icon">🎯</div>
            <div className="info-item__text">
              <strong>WebGPU 優先</strong><br />
              GPU が使えれば自動で WebGPU を選択。なければ WASM にフォールバック。
            </div>
          </div>
          <div className="info-item">
            <div className="info-item__icon">📱</div>
            <div className="info-item__text">
              <strong>カメラ切替</strong><br />
              モバイルでは前面/背面カメラを切り替えられます。
            </div>
          </div>
          <div className="info-item">
            <div className="info-item__icon">🎚️</div>
            <div className="info-item__text">
              <strong>閾値調整</strong><br />
              スライダーで検出感度をリアルタイムに調整可能。
            </div>
          </div>
          <div className="info-item">
            <div className="info-item__icon">🔒</div>
            <div className="info-item__text">
              <strong>完全ローカル</strong><br />
              映像データはブラウザ内のみで処理。サーバーには一切送信しません。
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        Powered by{' '}
        <a href="https://onnxruntime.ai/" target="_blank" rel="noopener noreferrer">ONNX Runtime Web</a>
        {' '}+ YOLOv8n-seg — {backend === 'webgpu' ? 'WebGPU' : 'WASM'} backend
      </footer>
    </div>
  );
};

// ---- HSL→RGB (ローカル版) ----
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export default RealtimeCameraPage;
