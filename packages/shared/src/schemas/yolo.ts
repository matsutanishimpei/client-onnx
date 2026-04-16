import { z } from 'zod';

/**
 * 個別の検出オブジェクトのスキーマ
 */
export const detectionSchema = z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  score: z.number(),
  classId: z.number(),
  className: z.string(),
  maskCoeffs: z.any(), // 内部では Float32Array、通信時は number[] となるため any で許容
});

/**
 * インスタンスセグメンテーション結果全体のスキーマ
 */
export const segResultSchema = z.object({
  detections: z.array(detectionSchema),
  /** 各検出ごとの 160x160 マスク (0-1 範囲) */
  masks: z.array(z.any()),
});

/**
 * データベース保存用の軽量な履歴スキーマ (マスクデータを除外)
 */
export const historyResultSchema = z.object({
  detections: z.array(detectionSchema),
});

/**
 * TypeScript 型定義
 */
export type Detection = z.infer<typeof detectionSchema>;
export type SegResult = z.infer<typeof segResultSchema>;
export type HistoryResult = z.infer<typeof historyResultSchema>;
