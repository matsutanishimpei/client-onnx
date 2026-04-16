import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import * as ort from 'onnxruntime-web';
import './index.css';

import HomePage from './pages/HomePage';
import MatMulPage from './pages/MatMulPage';
import YoloSegPage from './pages/YoloSegPage';
import RealtimeCameraPage from './pages/RealtimeCameraPage';
import HistoryPage from './pages/HistoryPage';
import client from './lib/hc';
import { ToastProvider } from './components/Toast';
// @ts-ignore: virtual:pwa-register is provided by vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

// Service Worker の自動更新登録
registerSW({ immediate: true });

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
const VALID_PAGES = ['matmul', 'yolo-seg', 'realtime-camera', 'history'] as const;

function getPageFromHash(): string {
  const hash = window.location.hash.replace('#', '');
  if ((VALID_PAGES as readonly string[]).includes(hash)) return hash;
  return 'home';
}

const App: React.FC = () => {
  const [page, setPage] = useState(getPageFromHash);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // グローバルエラー監視 (監視・ロギング用)
    const handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const errorData = {
        message: 'message' in event ? event.message : (event as any).reason?.message || 'Unknown Promise Rejection',
        type: event.type,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
      
      // バックエンドにログを送信 (非同期・Fire and forget)
      client.api.logs.$post({ json: errorData }).catch(() => {});
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

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

  const renderPage = () => {
    switch (page) {
      case 'matmul':
        return <MatMulPage onNavigate={navigate} />;
      case 'yolo-seg':
        return <YoloSegPage onNavigate={navigate} />;
      case 'realtime-camera':
        return <RealtimeCameraPage onNavigate={navigate} />;
      case 'history':
        return <HistoryPage onNavigate={navigate} />;
      default:
        return <HomePage onNavigate={navigate} />;
    }
  };

  return (
    <>
      {isOffline && (
        <div className="offline-banner">
          <span className="offline-banner__icon">📡</span>
          オフラインモード: インターネット未接続ですが、カメラ推論は利用可能です
        </div>
      )}
      {renderPage()}
      <style>{`
        .offline-banner {
          position: sticky;
          top: 0;
          z-index: 9999;
          background: #ff9800;
          color: #000;
          padding: 0.5rem 1rem;
          text-align: center;
          font-size: 0.85rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          animation: slideDown 0.3s ease-out;
        }
        .offline-banner__icon {
          font-size: 1.1rem;
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
