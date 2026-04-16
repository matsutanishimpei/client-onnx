/// <reference types="@cloudflare/workers-types" />
import { Hono, type MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { zValidator } from '@hono/zod-validator';
import { segResultSchema } from '@my-app/shared';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// 1. セキュリティヘッダーと CORS の適用
app.use('*', secureHeaders());
app.use('*', cors({
  origin: (origin) => {
    if (origin.startsWith('http://localhost') || origin.startsWith('https://client-onnx')) {
      return origin;
    }
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
}));

// 2. グローバルエラーハンドラー
app.onError((err, c) => {
  console.error(`[Fatal Error] ${c.req.method} ${c.req.url}:`, err);
  return c.json({
    success: false,
    message: 'Internal Server Error',
    error: err instanceof Error ? err.message : String(err)
  }, 500);
});

// 3. 簡易レートリミット用の変数
const requestCounts = new Map<string, { count: number, resetAt: number }>();

const rateLimit: MiddlewareHandler = async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || 'anonymous';
  const now = Date.now();
  const limitInfo = requestCounts.get(ip);

  if (!limitInfo || now > limitInfo.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + 60000 });
  } else {
    limitInfo.count++;
    if (limitInfo.count > 30) {
      return c.json({ error: 'Too many requests' }, 429);
    }
  }
  await next();
};

// 4. API 定義 (RPC 用にメソッドを繋げる)
const routes = app
  .post('/logs', async (c) => {
    const log = await c.req.json();
    console.warn('[Client Log]:', log);
    return c.json({ success: true });
  })
  .get('/hello', (c) => {
    return c.json({ message: 'Hello Hono!' });
  })
  .get('/detections', async (c) => {
    try {
      const { results } = await c.env.DB.prepare(
        'SELECT * FROM detections ORDER BY timestamp DESC LIMIT 50'
      ).all();
      
      const history = results.map((row: any) => {
        const fullJson = JSON.parse(row.results_json as string);
        // マスクがあれば削除した状態を保証 (念の為)
        const { masks, ...lightweightJson } = fullJson;
        return {
          ...row,
          results_json: lightweightJson
        };
      });

      return c.json(history);
    } catch (e) {
      return c.json({ error: String(e) }, 500);
    }
  })
  .post('/detections', rateLimit, zValidator('json', segResultSchema), async (c) => {
    const result = c.req.valid('json');
    
    // マスクデータは DB 保存用に除外 (1MB 制限回避)
    const { masks, ...dbResult } = result;

    const summary = result.detections
      .map(d => d.className)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(', ');

    try {
      await c.env.DB.prepare(
        'INSERT INTO detections (summary, results_json) VALUES (?, ?)'
      )
      .bind(summary || 'No objects', JSON.stringify(dbResult))
      .run();

      return c.json({
        success: true,
        message: `${result.detections.length} detections saved (masks excluded for storage).`,
      });
    } catch (e) {
      return c.json({ success: false, error: 'Database error' }, 500);
    }
  });

export type AppType = typeof routes;
export default app;
