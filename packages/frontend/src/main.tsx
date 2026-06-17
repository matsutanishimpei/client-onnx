import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import * as ort from 'onnxruntime-web';
import './index.css';

import HomePage from './pages/HomePage';
import MatMulPage from './pages/MatMulPage';
import RealtimeCameraPage from './pages/RealtimeCameraPage';
import { ToastProvider } from './components/Toast';
// @ts-ignore: virtual:pwa-register is provided by vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

// Service Worker の自動更新登録
registerSW({ immediate: true });

// ONNX Runtime: optimizeDeps.exclude により node_modules から直接解決されるため wasmPaths は不要

/**
 * ハッシュベースの簡易ルーター
 * #matmul → MatMulPage
 * #realtime-camera → RealtimeCameraPage
 * それ以外 → HomePage
 */
const VALID_PAGES = ['matmul', 'realtime-camera'] as const;

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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
      case 'realtime-camera':
        return <RealtimeCameraPage onNavigate={navigate} />;
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
