import { describe, it, expect } from 'vitest';
import { detectionSchema, segResultSchema } from './yolo';

describe('YOLO Zod Schemas', () => {
  describe('detectionSchema', () => {
    it('should validate a valid detection object', () => {
      const validDetection = {
        x1: 100,
        y1: 100,
        x2: 200,
        y2: 200,
        score: 0.95,
        classId: 0,
        className: 'person',
        maskCoeffs: new Float32Array(32).fill(0.1),
      };
      const result = detectionSchema.safeParse(validDetection);
      expect(result.success).toBe(true);
    });

    it('should fail on missing fields', () => {
      const invalidDetection = {
        x1: 100,
        y1: 100,
        // x2 missing
        y2: 200,
        score: 0.95,
        classId: 0,
        className: 'person',
        maskCoeffs: [0.1],
      };
      const result = detectionSchema.safeParse(invalidDetection);
      expect(result.success).toBe(false);
    });
  });

  describe('segResultSchema', () => {
    it('should validate a valid result object', () => {
      const validResult = {
        detections: [
          {
            x1: 10, y1: 10, x2: 50, y2: 50,
            score: 0.8, classId: 1, className: 'bicycle',
            maskCoeffs: [1, 2, 3]
          }
        ],
        masks: [new Float32Array(160 * 160).fill(0.5)]
      };
      const result = segResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });
  });
});
