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
          </p>
          <div className="demo-card__tags">
            <span className="tag tag--blue">MatMul</span>
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
          <h2 className="demo-card__title">YOLO セグメント</h2>
          <p className="demo-card__description">
            画像をアップロードして物体検出と領域分割を実行。
          </p>
          <div className="demo-card__tags">
            <span className="tag tag--cyan">YOLOv8</span>
            <span className="tag tag--green">Segmentation</span>
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
          <h2 className="demo-card__title">リアルタイム検出</h2>
          <p className="demo-card__description">
            カメラ映像を解析。WebGPU 対応で高速推論。
          </p>
          <div className="demo-card__tags">
            <span className="tag tag--cyan">YOLOv8</span>
            <span className="tag tag--orange">WebGPU</span>
            <span className="tag tag--green">Live</span>
          </div>
          <div className="demo-card__arrow">→</div>
        </button>

        {/* 履歴ページ */}
        <button
          id="nav-history"
          className="demo-card"
          onClick={() => onNavigate('history')}
        >
          <div className="demo-card__icon demo-card__icon--info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v13a2 2 0 01-2 2z" />
              <path d="M17 21v-8H7v8" />
              <path d="M7 3v5h8" />
            </svg>
          </div>
          <h2 className="demo-card__title">推論履歴</h2>
          <p className="demo-card__description">
            DB に保存された過去の解析結果を確認・振り返り。
          </p>
          <div className="demo-card__tags">
            <span className="tag tag--blue">D1 Database</span>
            <span className="tag tag--purple">History</span>
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
              WebAssembly / WebGPU
            </div>
          </div>
          <div className="info-item">
            <div className="info-item__icon">⚛️</div>
            <div className="info-item__text">
              <strong>React + Vite</strong><br />
              Fast Development
            </div>
          </div>
          <div className="info-item">
            <div className="info-item__icon">💾</div>
            <div className="info-item__text">
              <strong>Cloudflare D1</strong><br />
              Serverless DB
            </div>
          </div>
          <div className="info-item">
            <div className="info-item__icon">🌐</div>
            <div className="info-item__text">
              <strong>Hono + Workers</strong><br />
              Type-safe Edge API
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
