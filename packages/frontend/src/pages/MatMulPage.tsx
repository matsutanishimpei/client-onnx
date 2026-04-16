import React, { useState, useCallback } from 'react';
import * as ort from 'onnxruntime-web';
import { useToast } from '../components/Toast';

interface Props {
  onNavigate: (page: string) => void;
}

const INPUT_A_SHAPE: [number, number] = [3, 4];
const INPUT_B_SHAPE: [number, number] = [4, 3];
const OUTPUT_SHAPE: [number, number] = [3, 3];

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

type Status = 'idle' | 'loading' | 'success' | 'error';

interface RunResult {
  outputData: Float32Array;
  loadTimeMs: number;
  inferTimeMs: number;
}

const MatrixView: React.FC<{
  data: number[] | Float32Array;
  rows: number;
  cols: number;
  isResult?: boolean;
}> = ({ data, rows, cols, isResult }) => (
  <div className="matrix-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
    {Array.from(data).map((v, i) => (
      <div key={i} className={`matrix-cell ${isResult ? 'matrix-cell--result' : ''}`}>
        {fmt(v)}
      </div>
    ))}
  </div>
);

const MatMulPage: React.FC<Props> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);

  const dataA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const dataB = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

  const runInference = useCallback(async () => {
    setStatus('loading');
    setError('');
    setResult(null);
    try {
      const t0 = performance.now();
      const session = await ort.InferenceSession.create('/model.onnx');
      const loadTimeMs = performance.now() - t0;

      const tensorA = new ort.Tensor('float32', Float32Array.from(dataA), INPUT_A_SHAPE);
      const tensorB = new ort.Tensor('float32', Float32Array.from(dataB), INPUT_B_SHAPE);

      const t1 = performance.now();
      const results = await session.run({ a: tensorA, b: tensorB });
      const inferTimeMs = performance.now() - t1;

      const outputData = results.c.data as Float32Array;
      setResult({ outputData, loadTimeMs, inferTimeMs });
      setStatus('success');
      showToast('行列演算が成功しました', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
      showToast(msg, 'error');
    }
  }, [showToast]);

  return (
    <div className="app-container">
      <header className="header fade-in">
        <button className="back-btn" onClick={() => onNavigate('home')}>
          ← ホームに戻る
        </button>
        <div className="header__badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          MatMul Demo
        </div>
        <h1 className="header__title">行列乗算デモ</h1>
        <p className="header__subtitle">
          ONNX Runtime Web 公式 Quick Start モデルで行列 A × B の乗算を実行します。
        </p>
      </header>

      {/* Model Info */}
      <section className="card fade-in fade-in-delay-1">
        <div className="card__header">
          <div className="card__icon card__icon--primary">📐</div>
          <h2 className="card__title">モデル情報</h2>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-item__icon">🧮</div>
            <div className="info-item__text"><strong>演算:</strong> MatMul (行列乗算)</div>
          </div>
          <div className="info-item">
            <div className="info-item__icon">📥</div>
            <div className="info-item__text"><strong>入力 A:</strong> float32 [{INPUT_A_SHAPE.join('×')}]</div>
          </div>
          <div className="info-item">
            <div className="info-item__icon">📥</div>
            <div className="info-item__text"><strong>入力 B:</strong> float32 [{INPUT_B_SHAPE.join('×')}]</div>
          </div>
          <div className="info-item">
            <div className="info-item__icon">📤</div>
            <div className="info-item__text"><strong>出力 C:</strong> float32 [{OUTPUT_SHAPE.join('×')}]</div>
          </div>
        </div>
      </section>

      {/* Input & Run */}
      <section className="card fade-in fade-in-delay-2">
        <div className="card__header">
          <div className="card__icon card__icon--accent">📊</div>
          <h2 className="card__title">入力データ & 推論</h2>
        </div>
        <div className="matrix-row">
          <div className="matrix-section">
            <div className="matrix-label">Matrix A ({INPUT_A_SHAPE.join('×')})</div>
            <MatrixView data={dataA} rows={INPUT_A_SHAPE[0]} cols={INPUT_A_SHAPE[1]} />
          </div>
          <div className="matrix-operator">×</div>
          <div className="matrix-section">
            <div className="matrix-label">Matrix B ({INPUT_B_SHAPE.join('×')})</div>
            <MatrixView data={dataB} rows={INPUT_B_SHAPE[0]} cols={INPUT_B_SHAPE[1]} />
          </div>
          {result && (
            <>
              <div className="matrix-equals">=</div>
              <div className="matrix-section">
                <div className="matrix-label">Result C ({OUTPUT_SHAPE.join('×')})</div>
                <MatrixView data={result.outputData} rows={OUTPUT_SHAPE[0]} cols={OUTPUT_SHAPE[1]} isResult />
              </div>
            </>
          )}
        </div>
        <div style={{ marginTop: '1.25rem' }}>
          <button id="run-matmul-btn" className="btn btn--primary" onClick={runInference} disabled={status === 'loading'}>
            {status === 'loading' ? <><span className="spinner" /> 推論中...</> : <>▶ 推論を実行</>}
          </button>
        </div>
        {status === 'loading' && (
          <div className="status-bar status-bar--loading" style={{ marginTop: '1rem' }}>
            <span className="spinner" /> モデルの読み込みと推論を実行中...
          </div>
        )}
        {status === 'error' && (
          <div className="status-bar status-bar--error" style={{ marginTop: '1rem' }}>❌ エラー: {error}</div>
        )}
        {status === 'success' && (
          <div className="status-bar status-bar--success" style={{ marginTop: '1rem' }}>✅ 推論が正常に完了しました</div>
        )}
      </section>

      {/* Performance */}
      {result && (
        <section className="card fade-in fade-in-delay-3">
          <div className="card__header">
            <div className="card__icon card__icon--success">⚡</div>
            <h2 className="card__title">パフォーマンス</h2>
          </div>
          <div className="metrics">
            <div className="metric">
              <div className="metric__value">{result.loadTimeMs.toFixed(1)}</div>
              <div className="metric__label">モデル読込 (ms)</div>
            </div>
            <div className="metric">
              <div className="metric__value">{result.inferTimeMs.toFixed(2)}</div>
              <div className="metric__label">推論時間 (ms)</div>
            </div>
            <div className="metric">
              <div className="metric__value">{(result.loadTimeMs + result.inferTimeMs).toFixed(1)}</div>
              <div className="metric__label">合計 (ms)</div>
            </div>
            <div className="metric">
              <div className="metric__value">WASM</div>
              <div className="metric__label">バックエンド</div>
            </div>
          </div>
        </section>
      )}

      <footer className="footer">
        Powered by{' '}
        <a href="https://onnxruntime.ai/" target="_blank" rel="noopener noreferrer">ONNX Runtime Web</a>
        {' '}— 公式 Quick Start デモモデルを使用
      </footer>
    </div>
  );
};

export default MatMulPage;
