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
        <h1 className="header__title">Web AI デモアプリ</h1>
        <p className="header__subtitle">
          サーバーとの通信を行わず、お使いのブラウザ内だけで安全かつ高速に人工知能の計算（推論）を行う最先端のデモアプリです。
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
          <h2 className="demo-card__title">行列の掛け算 (MatMul)</h2>
          <p className="demo-card__description">
            AIモデルの最も基本的な計算である「行列の乗算」をブラウザ（WASM方式）で直接行い、正しい結果が即座に出るかテストできます。
          </p>
          <div className="demo-card__tags">
            <span className="tag tag--blue">WASM 動作テスト</span>
            <span className="tag tag--gray">基本計算</span>
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
          <h2 className="demo-card__title">カメラでリアルタイムAI検出</h2>
          <p className="demo-card__description">
            カメラの映像を解析し、写っている物を瞬時に検出して色付きでわかりやすく切り分けます。WebGPU対応デバイスならさらに滑らかに動きます。
          </p>
          <div className="demo-card__tags">
            <span className="tag tag--cyan">YOLOv8</span>
            <span className="tag tag--orange">WebGPU 高速化</span>
            <span className="tag tag--green">カメラ対応</span>
          </div>
          <div className="demo-card__arrow">→</div>
        </button>

      </div>

      {/* 技術スタック */}
      <section className="card fade-in fade-in-delay-2" style={{ marginTop: '2rem' }}>
        <div className="card__header">
          <div className="card__icon card__icon--primary">🛠</div>
          <h2 className="card__title">本システムの特徴・技術</h2>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-item__icon">⚡</div>
            <div className="info-item__text">
              <strong>ONNX Runtime Web</strong><br />
              ブラウザの中でAIモデルを動かす標準的な実行エンジンです。
            </div>
          </div>
          <div className="info-item">
            <div className="info-item__icon">⚛️</div>
            <div className="info-item__text">
              <strong>React + Vite</strong><br />
              画面表示を素早く行い、快適な操作感を提供するための仕組みです。
            </div>
          </div>
          <div className="info-item">
            <div className="info-item__icon">🔒</div>
            <div className="info-item__text">
              <strong>安心の完全プライベート</strong><br />
              カメラ画像などの全ての情報は端末から送信されず、手元で処理されます。
            </div>
          </div>
          <div className="info-item">
            <div className="info-item__icon">✈️</div>
            <div className="info-item__text">
              <strong>オフライン動作 (PWA)</strong><br />
              一度読み込めば、電波の繋がらない場所でもカメラAI機能をご利用いただけます。
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
