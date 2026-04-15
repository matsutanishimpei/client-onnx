import React from 'react';

interface Props {
  onNavigate: (page: string) => void;
}

const HomePage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="app-container">
      <header className="header fade-in">
        <div className="header__badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          ONNX Runtime Web
        </div>
        <h1 className="header__title">AI デモ ポータル</h1>
        <p className="header__subtitle">
          ONNX Runtime Web を使用したブラウザ上での AI 推論デモ集。
          WebAssembly により、サーバー不要でリアルタイム推論が可能です。
        </p>
      </header>

      <div className="demo-grid fade-in fade-in-delay-1">
        {/* MatMul デモ */}
        <button
          id="nav-matmul"
          className="demo-card"
          onClick={() => onNavigate('matmul')}
        >
          <div className="demo-card__icon demo-card__icon--primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h2 className="demo-card__title">行列乗算 (MatMul)</h2>
          <p className="demo-card__description">
            公式 Quick Start モデルで行列 A×B の乗算を WASM バックエンドで実行。
            ONNX Runtime Web の基本的な使い方を学べます。
          </p>
          <div className="demo-card__tags">
            <span className="tag tag--blue">MatMul</span>
            <span className="tag tag--purple">Quick Start</span>
            <span className="tag tag--gray">~120B</span>
          </div>
          <div className="demo-card__arrow">→</div>
        </button>

        {/* YOLO セグメンテーション */}
        <button
          id="nav-yolo-seg"
          className="demo-card"
          onClick={() => onNavigate('yolo-seg')}
        >
          <div className="demo-card__icon demo-card__icon--accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="demo-card__title">YOLO インスタンスセグメンテーション</h2>
          <p className="demo-card__description">
            YOLOv8n-seg で画像内のオブジェクトを検出＆ピクセル単位で
            セグメンテーション。80 クラスの物体を認識します。
          </p>
          <div className="demo-card__tags">
            <span className="tag tag--cyan">YOLOv8</span>
            <span className="tag tag--green">Segmentation</span>
            <span className="tag tag--gray">~13MB</span>
          </div>
          <div className="demo-card__arrow">→</div>
        </button>

        {/* リアルタイムカメラ */}
        <button
          id="nav-realtime-camera"
          className="demo-card demo-card--featured"
          onClick={() => onNavigate('realtime-camera')}
        >
          <div className="demo-card__icon demo-card__icon--live">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <h2 className="demo-card__title">リアルタイムカメラ検出</h2>
          <p className="demo-card__description">
            カメラ映像をリアルタイムに解析。WebGPU 対応ブラウザでは
            GPU アクセラレーションで高速推論を実現します。
          </p>
          <div className="demo-card__tags">
            <span className="tag tag--cyan">YOLOv8</span>
            <span className="tag tag--orange">WebGPU</span>
            <span className="tag tag--green">Real-time</span>
            <span className="tag tag--gray">~13MB</span>
          </div>
          <div className="demo-card__arrow">→</div>
        </button>
      </div>

      {/* 技術スタック */}
      <section className="card fade-in fade-in-delay-2" style={{ marginTop: '2rem' }}>
        <div className="card__header">
          <div className="card__icon card__icon--primary">🛠</div>
          <h2 className="card__title">技術スタック</h2>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-item__icon">⚡</div>
            <div className="info-item__text">
              <strong>ONNX Runtime Web</strong><br />
              WebAssembly ベースの高速推論
            </div>
          </div>
          <div className="info-item">
            <div className="info-item__icon">⚛️</div>
            <div className="info-item__text">
              <strong>React + Vite</strong><br />
              高速な開発サーバー & HMR
            </div>
          </div>
          <div className="info-item">
            <div className="info-item__icon">🌐</div>
            <div className="info-item__text">
              <strong>ブラウザ完結</strong><br />
              サーバー送信不要・プライバシー保護
            </div>
          </div>
          <div className="info-item">
            <div className="info-item__icon">📦</div>
            <div className="info-item__text">
              <strong>ONNX 形式</strong><br />
              フレームワーク非依存の標準モデルフォーマット
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        Powered by{' '}
        <a href="https://onnxruntime.ai/" target="_blank" rel="noopener noreferrer">
          ONNX Runtime Web
        </a>
      </footer>
    </div>
  );
};

export default HomePage;
