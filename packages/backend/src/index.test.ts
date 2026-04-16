import { describe, it, expect, vi } from 'vitest';
import app from './index';

// D1 データベースのモックを作成
const mockDB = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  all: vi.fn().mockResolvedValue({ results: [] }),
  run: vi.fn().mockResolvedValue({ success: true }),
};

describe('Backend API Integration', () => {
  describe('GET /api/hello', () => {
    it('should return hello message', async () => {
      const res = await app.request('/api/hello');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ message: 'Hello Hono!' });
    });
  });

  describe('POST /api/detections', () => {
    it('should accept valid detection results', async () => {
      const validData = {
        detections: [
          {
            x1: 10, y1: 10, x2: 100, y2: 100,
            score: 0.9, classId: 0, className: 'person',
            maskCoeffs: Array(32).fill(0.5)
          }
        ],
        masks: [Array(160 * 160).fill(0)]
      };

      // Mocked DB を env として渡す
      const res = await app.fetch(
        new Request('http://localhost/api/detections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validData),
        }),
        { DB: mockDB }
      );

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      // フェーズ 4 で変更した新しいメッセージを確認
      expect(body.message).toContain('masks excluded for storage');
      
      // DB 操作が正しく呼ばれたか検証
      expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO detections'));
      expect(mockDB.run).toHaveBeenCalled();
    });

    it('should reject invalid data with 400 Bad Request', async () => {
      const invalidData = {
        detections: [{ x1: "invalid", y1: 10 }]
      };

      const res = await app.request('/api/detections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/detections', () => {
    it('should return detection history', async () => {
      // 履歴取得のモック
      mockDB.all.mockResolvedValueOnce({
        results: [
          { id: 1, summary: 'person', results_json: JSON.stringify({ detections: [] }), timestamp: '2026-04-16' }
        ]
      });

      const res = await app.fetch(
        new Request('http://localhost/api/detections'),
        { DB: mockDB }
      );

      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      expect(body.length).toBeGreaterThan(0);
      expect(body[0].summary).toBe('person');
    });
  });
});
