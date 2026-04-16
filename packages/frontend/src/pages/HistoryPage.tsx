import { useState, useEffect } from 'react';
import client from '../lib/hc';
import { type HistoryResult } from '@my-app/shared';

interface HistoryItem {
  id: number;
  timestamp: string;
  summary: string;
  results_json: HistoryResult;
}

interface Props {
  onNavigate: (page: string) => void;
}

const HistoryPage: React.FC<Props> = ({ onNavigate }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await client.api.detections.$get();
        if (res.ok) {
          const data = await res.json();
          setHistory(data as HistoryItem[]);
        } else {
          setError('履歴の取得に失敗しました');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '取得エラー');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="app-container">
      <header className="header fade-in">
        <button className="back-button" onClick={() => onNavigate('home')}>
          ← 戻る
        </button>
        <h2 className="header__title">推論履歴</h2>
      </header>

      <main className="main-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>読み込み中...</p>
          </div>
        ) : error ? (
          <div className="error-card">
            <p>{error}</p>
            <button className="button button--secondary" onClick={() => window.location.reload()}>
              再試行
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <p>保存された履歴はありません</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div key={item.id} className="history-card">
                <div className="history-card__header">
                  <span className="history-card__date">
                    {new Date(item.timestamp).toLocaleString('ja-JP')}
                  </span>
                  <span className="history-card__id">#{item.id}</span>
                </div>
                <div className="history-card__body">
                  <h3 className="history-card__summary">{item.summary}</h3>
                  <div className="history-card__details">
                    <span>検出数: {item.results_json.detections.length}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        .history-list {
          display: grid;
          gap: 1rem;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }
        .history-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.25rem;
          transition: transform 0.2s, background 0.2s;
        }
        .history-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.08);
        }
        .history-card__header {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 0.5rem;
        }
        .history-card__summary {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--primary-color);
          margin-bottom: 0.25rem;
        }
        .history-card__details {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .empty-state {
          text-align: center;
          padding: 4rem;
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
};

export default HistoryPage;
