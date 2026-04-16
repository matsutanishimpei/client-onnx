import { describe, it, expect } from 'vitest';
import { iou, nms, type Detection } from './yoloUtils';

describe('YOLO Utility Functions', () => {
  describe('iou (Intersection over Union)', () => {
    it('should calculate perfect overlap as 1.0', () => {
      const box = { x1: 0, y1: 0, x2: 10, y2: 10, score: 1, classId: 0, className: '', maskCoeffs: new Float32Array() };
      expect(iou(box, box)).toBeCloseTo(1.0);
    });

    it('should calculate no overlap as 0.0', () => {
      const boxA = { x1: 0, y1: 0, x2: 10, y2: 10, score: 1, classId: 0, className: '', maskCoeffs: new Float32Array() };
      const boxB = { x1: 20, y1: 20, x2: 30, y2: 30, score: 1, classId: 0, className: '', maskCoeffs: new Float32Array() };
      expect(iou(boxA, boxB)).toBe(0);
    });

    it('should calculate partial overlap correctly', () => {
      const boxA = { x1: 0, y1: 0, x2: 10, y2: 10, score: 1, classId: 0, className: '', maskCoeffs: new Float32Array() };
      const boxB = { x1: 5, y1: 0, x2: 15, y2: 10, score: 1, classId: 0, className: '', maskCoeffs: new Float32Array() };
      // Intersection = 5 * 10 = 50
      // Union = (10*10) + (10*10) - 50 = 150
      // IoU = 50 / 150 = 0.333...
      expect(iou(boxA, boxB)).toBeCloseTo(0.3333, 4);
    });
  });

  describe('nms (Non-Maximum Suppression)', () => {
    it('should suppress overlapping boxes of the same class', () => {
      const detections: Detection[] = [
        { x1: 0, y1: 0, x2: 10, y2: 10, score: 0.9, classId: 0, className: 'a', maskCoeffs: new Float32Array() },
        { x1: 1, y1: 1, x2: 11, y2: 11, score: 0.8, classId: 0, className: 'a', maskCoeffs: new Float32Array() }, // Overlaps A
        { x1: 20, y1: 20, x2: 30, y2: 30, score: 0.95, classId: 0, className: 'a', maskCoeffs: new Float32Array() }, // Distinct
      ];

      const kept = nms(detections, 0.5);
      expect(kept.length).toBe(2);
      expect(kept[0].score).toBe(0.95);
      expect(kept[1].score).toBe(0.9);
    });

    it('should NOT suppress overlapping boxes of different classes', () => {
      const detections: Detection[] = [
        { x1: 0, y1: 0, x2: 10, y2: 10, score: 0.9, classId: 0, className: 'cat', maskCoeffs: new Float32Array() },
        { x1: 1, y1: 1, x2: 11, y2: 11, score: 0.8, classId: 1, className: 'dog', maskCoeffs: new Float32Array() },
      ];

      const kept = nms(detections, 0.5);
      expect(kept.length).toBe(2);
    });
  });
});
