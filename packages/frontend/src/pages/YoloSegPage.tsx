import React, { useState, useRef, useCallback } from 'react';
import * as ort from 'onnxruntime-web';
import {
  preprocessImage,
  drawSegmentationResults,
  type SegResult,
} from '../lib/yoloSeg';
import { COCO_LABELS, getClassColor, getClassColorSolid } from '../lib/cocoLabels';
import { YoloWorkerClient } from '../lib/yoloWorkerClient';
import client from '../lib/hc';
import { useToast } from '../components/Toast';

interface Props {
  onNavigate: (page: string) => void;
}

type Status = 'idle' | 'loading-model' | 'preprocessing' | 'inferring' | 'postprocessing' | 'done' | 'error';

interface TimingInfo {
  modelLoad: number;
  preprocess: number;
  inference: number;
  postprocess: number;
  total: number;
}

const SAMPLE_IMAGES = [
  {
    url: 'https://ultralytics.com/images/bus.jpg',
    label: 'バス & 人物',
  },
  {
    url: 'https://ultralytics.com/images/zidane.jpg',
    label: 'サッカー選手',
  },
];

const YoloSegPage: React.FC<Props> = ({ onNavigate }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [timing, setTiming] = useState<TimingInfo | null>(null);
  const [segResult, setSegResult] = useState<SegResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [confThreshold, setConfThreshold] = useState(0.25);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef<ort.InferenceSession | null>(null);
  const workerClientRef = useRef<YoloWorkerClient | null>(null);

  /** 画像を読み込んで推論を実行する */
  const runSegmentation = useCallback(async (imgSrc: string) => {
    setError('');
    setSegResult(null);
    setTiming(null);
    setImageUrl(imgSrc);

    const totalStart = performance.now();

    try {
      // 画像の読み込み
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
        img.src = imgSrc;
      });

      if (imgRef.current) {
        imgRef.current.src = imgSrc;
      }

      // 1. モデルの読み込み
      setStatus('loading-model');
      let modelLoadTime = 0;
      if (!sessionRef.current) {
        const t0 = performance.now();
        sessionRef.current = await ort.InferenceSession.create('/yolov8n-seg.onnx');
        modelLoadTime = performance.now() - t0;
      }

      // 2. 前処理
      setStatus('preprocessing');
      const t1 = performance.now();
      const [tensorData, scale, padX, padY] = preprocessImage(img);
      const preprocessTime = performance.now() - t1;

      // 3. 推論
      setStatus('inferring');
      const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, 640, 640]);
      const t2 = performance.now();
      const results = await sessionRef.current.run({ images: inputTensor });
      const inferenceTime = performance.now() - t2;

      // 4. 後処理
      setStatus('postprocessing');
      const t3 = performance.now();

      const output0 = results['output0'].data as Float32Array;
      const output1 = results['output1'].data as Float32Array;

      if (!workerClientRef.current) {
        workerClientRef.current = new YoloWorkerClient();
      }

      const result = await workerClientRef.current.postprocess(
        output0,
        output1,
        confThreshold,
        0.45,
        COCO_LABELS,
      );
      const postprocessTime = performance.now() - t3;

      // 5. 描画
      if (canvasRef.current) {
        drawSegmentationResults(
          canvasRef.current,
          img,
          result,
          scale,
          padX,
          padY,
          getClassColor,
          getClassColorSolid,
        );
      }

      const totalTime = performance.now() - totalStart;
      setTiming({
        modelLoad: modelLoadTime,
        preprocess: preprocessTime,
        inference: inferenceTime,
        postprocess: postprocessTime,
        total: totalTime,
      });
      setSegResult(result);
      setStatus('done');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
      showToast(msg, 'error');
    }
  }, [confThreshold, showToast]);

  /** 保存処理 */
  const handleSave = useCallback(async () => {
    if (!segResult || isSaving) return;
    setIsSaving(true);
    try {
      const res = await client.api.detections.$post({
        json: segResult as any
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
  }, [segResult, isSaving, showToast]);

  /** ファイル選択ハンドラ */
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    runSegmentation(url);
  }, [runSegmentation]);

  /** ドラッグ&ドロップ */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    runSegmentation(url);
  }, [runSegmentation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const isProcessing = status !== 'idle' && status !== 'done' && status !== 'error';

  const statusMessages: Record<Status, string> = {
    'idle': '画像を選択して推論を開始',
    'loading-model': '🔄 モデルを読み込み中... (初回のみ)',
    'preprocessing': '🖼️ 画像を前処理中...',
    'inferring': '🧠 YOLOv8 推論実行中...',
    'postprocessing': '🎭 マスク生成 & NMS 処理中...',
    'done': '✅ 完了',
    'error': `❌ エラー: ${error}`,
  };

  // クリーンアップ
  React.useEffect(() => {
    return () => {
      workerClientRef.current?.terminate();
    };
  }, []);

  return (
    <div className="app-container">
      <header className="header fade-in">
        <button className="back-btn" onClick={() => onNavigate('home')}>
          ← ホームに戻る
        </button>
        <div className="header__badge header__badge--accent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          YOLOv8 Instance Segmentation
        </div>
        <h1 className="header__title">インスタンスセグメンテーション</h1>
        <p className="header__subtitle">
          YOLOv8n-seg モデルで画像内の物体をピクセル単位で分割。
          80 クラスの COCO オブジェクトを検出します。
        </p>
      </header>

      {/* 画像入力エリア */}
      <section className="card fade-in fade-in-delay-1">
        <div className="card__header">
          <div className="card__icon card__icon--accent">📸</div>
          <h2 className="card__title">画像入力</h2>
        </div>

        {/* サンプル画像 */}
        <div className="card__description">サンプル画像で試す:</div>
        <div className="sample-images">
          {SAMPLE_IMAGES.map((sample, idx) => (
            <button
              key={idx}
              className="btn btn--sample"
              onClick={() => runSegmentation(sample.url)}
              disabled={isProcessing}
            >
              📷 {sample.label}
            </button>
          ))}
        </div>

        {/* ファイルアップロード */}
        <div
          className="drop-zone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="drop-zone__icon">🖼️</div>
          <div className="drop-zone__text">
            クリックまたはドラッグ&ドロップで画像をアップロード
          </div>
          <div className="drop-zone__hint">JPG, PNG, WebP 対応</div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {/* 信頼度閾値 */}
        <div className="threshold-control">
          <label className="threshold-label">
            信頼度閾値: <strong>{confThreshold.toFixed(2)}</strong>
          </label>
          <input
            type="range"
            min="0.05"
            max="0.95"
            step="0.05"
            value={confThreshold}
            onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
            className="threshold-slider"
          />
        </div>

        {/* ステータス */}
        {status !== 'idle' && (
          <div
            className={`status-bar ${
              status === 'error'
                ? 'status-bar--error'
                : status === 'done'
                ? 'status-bar--success'
                : 'status-bar--loading'
            }`}
            style={{ marginTop: '1rem' }}
          >
            {isProcessing && <span className="spinner" />}
            {statusMessages[status]}
          </div>
        )}
      </section>

      {/* 結果表示 */}
      {(status === 'done' || isProcessing) && (
        <section className="card fade-in fade-in-delay-2">
          <div className="card__header">
            <div className="card__icon card__icon--success">🎯</div>
            <h2 className="card__title">セグメンテーション結果</h2>
            {status === 'done' && (
              <button 
                className={`btn btn--primary btn--sm ${isSaving ? 'btn--loading' : ''}`}
                style={{ marginLeft: 'auto' }}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? '保存中...' : '💾 履歴に保存'}
              </button>
            )}
          </div>
          <div className="result-canvas-wrapper">
            <canvas ref={canvasRef} className="result-canvas" />
            {/* 元画像は非表示で保持 */}
            <img ref={imgRef} style={{ display: 'none' }} crossOrigin="anonymous" />
          </div>
        </section>
      )}

      {/* 検出一覧 & パフォーマンス */}
      {segResult && timing && (
        <>
          <section className="card fade-in fade-in-delay-3">
            <div className="card__header">
              <div className="card__icon card__icon--primary">📋</div>
              <h2 className="card__title">
                検出結果 ({segResult.detections.length} オブジェクト)
              </h2>
            </div>
            {segResult.detections.length === 0 ? (
              <div className="status-bar status-bar--idle">
                検出されたオブジェクトはありません。信頼度閾値を下げてみてください。
              </div>
            ) : (
              <div className="detection-list">
                {segResult.detections.map((det, i) => (
                  <div key={i} className="detection-item">
                    <div
                      className="detection-item__color"
                      style={{ background: getClassColorSolid(det.classId) }}
                    />
                    <div className="detection-item__name">{det.className}</div>
                    <div className="detection-item__score">
                      {(det.score * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card fade-in">
            <div className="card__header">
              <div className="card__icon card__icon--success">⚡</div>
              <h2 className="card__title">パフォーマンス</h2>
            </div>
            <div className="metrics">
              {timing.modelLoad > 0 && (
                <div className="metric">
                  <div className="metric__value">{timing.modelLoad.toFixed(0)}</div>
                  <div className="metric__label">モデル読込 (ms)</div>
                </div>
              )}
              <div className="metric">
                <div className="metric__value">{timing.preprocess.toFixed(0)}</div>
                <div className="metric__label">前処理 (ms)</div>
              </div>
              <div className="metric">
                <div className="metric__value">{timing.inference.toFixed(0)}</div>
                <div className="metric__label">推論 (ms)</div>
              </div>
              <div className="metric">
                <div className="metric__value">{timing.postprocess.toFixed(0)}</div>
                <div className="metric__label">後処理 (ms)</div>
              </div>
              <div className="metric">
                <div className="metric__value">{timing.total.toFixed(0)}</div>
                <div className="metric__label">合計 (ms)</div>
              </div>
            </div>
          </section>
        </>
      )}

      <footer className="footer">
        Powered by{' '}
        <a href="https://onnxruntime.ai/" target="_blank" rel="noopener noreferrer">ONNX Runtime Web</a>
        {' '}+ YOLOv8n-seg (Ultralytics)
      </footer>
    </div>
  );
};

export default YoloSegPage;
