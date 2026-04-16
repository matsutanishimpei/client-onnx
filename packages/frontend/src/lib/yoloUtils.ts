import { type Detection, type SegResult } from '@my-app/shared';

export type { Detection, SegResult };
export const NUM_CLASSES = 80;
export const NUM_MASK_COEFFS = 32;
export const MODEL_INPUT_SIZE = 640;
export const MASK_SIZE = 160;

/**
 * YOLOv8-seg の出力を後処理して検出結果 + マスクを返す
 */
export function postprocessYoloSeg(
  output0Data: Float32Array,
  output1Data: Float32Array,
  confThreshold = 0.25,
  iouThreshold = 0.45,
  labels: string[],
): SegResult {
  const numAnchors = 8400;

  // 1. 候補の抽出
  const candidates: Detection[] = [];

  for (let i = 0; i < numAnchors; i++) {
    let maxScore = 0;
    let maxClassId = 0;
    for (let c = 0; c < NUM_CLASSES; c++) {
      const score = output0Data[(4 + c) * numAnchors + i];
      if (score > maxScore) {
        maxScore = score;
        maxClassId = c;
      }
    }

    if (maxScore < confThreshold) continue;

    // xywh -> xyxy
    const cx = output0Data[0 * numAnchors + i];
    const cy = output0Data[1 * numAnchors + i];
    const w = output0Data[2 * numAnchors + i];
    const h = output0Data[3 * numAnchors + i];
    const x1 = cx - w / 2;
    const y1 = cy - h / 2;
    const x2 = cx + w / 2;
    const y2 = cy + h / 2;

    const maskCoeffs = new Float32Array(NUM_MASK_COEFFS);
    for (let m = 0; m < NUM_MASK_COEFFS; m++) {
      maskCoeffs[m] = output0Data[(4 + NUM_CLASSES + m) * numAnchors + i];
    }

    candidates.push({
      x1, y1, x2, y2,
      score: maxScore,
      classId: maxClassId,
      className: labels[maxClassId] ?? `class_${maxClassId}`,
      maskCoeffs,
    });
  }

  // 2. NMS
  const selected = nms(candidates, iouThreshold);

  // 3. マスク生成: 係数 × プロトタイプ
  const masks: Float32Array[] = [];
  const maskArea = MASK_SIZE * MASK_SIZE;

  for (const det of selected) {
    const mask = new Float32Array(maskArea);
    for (let m = 0; m < NUM_MASK_COEFFS; m++) {
      const coeff = det.maskCoeffs[m];
      const protoOffset = m * maskArea;
      for (let j = 0; j < maskArea; j++) {
        mask[j] += coeff * output1Data[protoOffset + j];
      }
    }

    // sigmoid 適用
    for (let j = 0; j < maskArea; j++) {
      mask[j] = 1 / (1 + Math.exp(-mask[j]));
    }

    // bounding box 内にクリップ
    const bx1 = Math.max(0, Math.floor((det.x1 / MODEL_INPUT_SIZE) * MASK_SIZE));
    const by1 = Math.max(0, Math.floor((det.y1 / MODEL_INPUT_SIZE) * MASK_SIZE));
    const bx2 = Math.min(MASK_SIZE, Math.ceil((det.x2 / MODEL_INPUT_SIZE) * MASK_SIZE));
    const by2 = Math.min(MASK_SIZE, Math.ceil((det.y2 / MODEL_INPUT_SIZE) * MASK_SIZE));

    for (let y = 0; y < MASK_SIZE; y++) {
      for (let x = 0; x < MASK_SIZE; x++) {
        if (x < bx1 || x >= bx2 || y < by1 || y >= by2) {
          mask[y * MASK_SIZE + x] = 0;
        }
      }
    }

    masks.push(mask);
  }

  return { detections: selected, masks };
}

/** NMS (Non-Maximum Suppression) */
export function nms(detections: Detection[], iouThreshold: number): Detection[] {
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const keep: Detection[] = [];
  const suppressed = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;
    keep.push(sorted[i]);
    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue;
      if (sorted[i].classId !== sorted[j].classId) continue;
      if (iou(sorted[i], sorted[j]) > iouThreshold) {
        suppressed.add(j);
      }
    }
  }
  return keep;
}

/** IoU (Intersection over Union) */
export function iou(a: Detection, b: Detection): number {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  return intersection / (areaA + areaB - intersection + 1e-6);
}

/** HSL → RGB */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
