import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import * as ort from 'onnxruntime-web';
import './index.css';

import HomePage from './pages/HomePage';
import MatMulPage from './pages/MatMulPage';
import YoloSegPage from './pages/YoloSegPage';
import RealtimeCameraPage from './pages/RealtimeCameraPage';

// ONNX Runtime の WASM ファイルを CDN から読み込む設定
const ORT_VERSION = (ort.env as any).versions?.web ?? '1.24.3';
ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;

/**
 * ハッシュベースの簡易ルーター
 * #matmul → MatMulPage
 * #yolo-seg → YoloSegPage
 * #realtime-camera → RealtimeCameraPage
 * それ以外 → HomePage
 */
const VALID_PAGES = ['matmul', 'yolo-seg', 'realtime-camera'] as const;

function getPageFromHash(): string {
  const hash = window.location.hash.replace('#', '');
  if ((VALID_PAGES as readonly string[]).includes(hash)) return hash;
  return 'home';
}

const App: React.FC = () => {
  const [page, setPage] = useState(getPageFromHash);

  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((target: string) => {
    window.location.hash = target === 'home' ? '' : target;
    setPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  switch (page) {
    case 'matmul':
      return <MatMulPage onNavigate={navigate} />;
    case 'yolo-seg':
      return <YoloSegPage onNavigate={navigate} />;
    case 'realtime-camera':
      return <RealtimeCameraPage onNavigate={navigate} />;
    default:
      return <HomePage onNavigate={navigate} />;
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
