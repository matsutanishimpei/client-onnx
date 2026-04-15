/**
 * YOLOv8-seg ONNX モデルの後処理ユーティリティ
 *
 * モデル出力:
 *   output0: [1, 116, 8400]  — 各アンカーに対して [x, y, w, h, cls0..cls79, mask0..mask31]
 *   output1: [1, 32, 160, 160] — マスクプロトタイプ
 *
 * インスタンスセグメンテーションの流れ:
 *   1. output0 から信頼度 > threshold のアンカーを抽出
 *   2. NMS (Non-Maximum Suppression) で重複除去
 *   3. マスク係数 × マスクプロトタイプ → 各オブジェクトのマスクを生成
 */

const NUM_CLASSES = 80;
const NUM_MASK_COEFFS = 32;
const MODEL_INPUT_SIZE = 640;
const MASK_SIZE = 160;

export interface Detection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  score: number;
  classId: number;
  className: string;
  maskCoeffs: Float32Array;
}

export interface SegResult {
  detections: Detection[];
  /** 各検出ごとの 160x160 マスク (0-1 範囲、sigmoid 適用済み) */
  masks: Float32Array[];
}

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
  // ---- output0: [1, 116, 8400] を転置 → [8400, 116] にする ----
  const numAnchors = 8400;
  const stride = 4 + NUM_CLASSES + NUM_MASK_COEFFS; // 116

  // 候補の抽出
  const candidates: Detection[] = [];

  for (let i = 0; i < numAnchors; i++) {
    // クラスごとの確信度を取得し、最大値のクラスを見つける
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

    // xywh → xyxy
    const cx = output0Data[0 * numAnchors + i];
    const cy = output0Data[1 * numAnchors + i];
    const w = output0Data[2 * numAnchors + i];
    const h = output0Data[3 * numAnchors + i];
    const x1 = cx - w / 2;
    const y1 = cy - h / 2;
    const x2 = cx + w / 2;
    const y2 = cy + h / 2;

    // マスク係数を取得
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

  // ---- NMS ----
  const selected = nms(candidates, iouThreshold);

  // ---- マスク生成: 係数 × プロトタイプ ----
  // output1: [1, 32, 160, 160] → protos[32][160*160]
  const masks: Float32Array[] = [];
  const maskArea = MASK_SIZE * MASK_SIZE;

  for (const det of selected) {
    const mask = new Float32Array(maskArea);

    // 線形結合: mask[j] = sum(coeffs[m] * proto[m][j]) for m in 0..31
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

    // bounding box 内にクリップ（box 外のピクセルは 0 にする）
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

/**
 * 画像をモデルの入力テンソル用に前処理する
 * - 640x640 にリサイズ（レターボックス）
 * - RGB & 0-1 正規化
 * - NCHW 形式に変換
 *
 * @returns [tensorData, scale, padX, padY]
 */
export function preprocessImage(
  imgElement: HTMLImageElement | HTMLCanvasElement,
): [Float32Array, number, number, number] {
  const canvas = document.createElement('canvas');
  canvas.width = MODEL_INPUT_SIZE;
  canvas.height = MODEL_INPUT_SIZE;
  const ctx = canvas.getContext('2d')!;

  // レターボックス: アスペクト比を維持してリサイズ
  const imgW = imgElement.width || (imgElement as HTMLImageElement).naturalWidth;
  const imgH = imgElement.height || (imgElement as HTMLImageElement).naturalHeight;
  const scale = Math.min(MODEL_INPUT_SIZE / imgW, MODEL_INPUT_SIZE / imgH);
  const newW = Math.round(imgW * scale);
  const newH = Math.round(imgH * scale);
  const padX = (MODEL_INPUT_SIZE - newW) / 2;
  const padY = (MODEL_INPUT_SIZE - newH) / 2;

  // 背景を灰色 (114/255) で塗りつぶし
  ctx.fillStyle = `rgb(114, 114, 114)`;
  ctx.fillRect(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  ctx.drawImage(imgElement, padX, padY, newW, newH);

  const imageData = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const { data } = imageData;
  const totalPixels = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;

  // NCHW 形式 (1, 3, 640, 640) に変換 & 0-1 正規化
  const tensorData = new Float32Array(3 * totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    tensorData[i] = data[i * 4] / 255.0;                     // R
    tensorData[totalPixels + i] = data[i * 4 + 1] / 255.0;   // G
    tensorData[2 * totalPixels + i] = data[i * 4 + 2] / 255.0; // B
  }

  return [tensorData, scale, padX, padY];
}

/**
 * マスクを元画像サイズの canvas に描画する
 */
export function drawSegmentationResults(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  result: SegResult,
  scale: number,
  padX: number,
  padY: number,
  getColor: (classId: number, alpha: number) => string,
  getColorSolid: (classId: number) => string,
) {
  const ctx = canvas.getContext('2d')!;
  const imgW = image.naturalWidth;
  const imgH = image.naturalHeight;
  canvas.width = imgW;
  canvas.height = imgH;

  // 元画像を描画
  ctx.drawImage(image, 0, 0, imgW, imgH);

  const { detections, masks } = result;

  // マスクのオーバーレイ描画
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = MASK_SIZE;
  maskCanvas.height = MASK_SIZE;
  const maskCtx = maskCanvas.getContext('2d')!;

  for (let d = 0; d < detections.length; d++) {
    const det = detections[d];
    const mask = masks[d];

    // マスク画像を作成
    const maskImageData = maskCtx.createImageData(MASK_SIZE, MASK_SIZE);
    const hue = (det.classId * 137.5) % 360;

    // HSL → RGB (簡易変換)
    const [r, g, b] = hslToRgb(hue / 360, 0.75, 0.55);

    for (let i = 0; i < MASK_SIZE * MASK_SIZE; i++) {
      const alpha = mask[i] > 0.5 ? 128 : 0; // 閾値 0.5
      maskImageData.data[i * 4] = r;
      maskImageData.data[i * 4 + 1] = g;
      maskImageData.data[i * 4 + 2] = b;
      maskImageData.data[i * 4 + 3] = alpha;
    }
    maskCtx.putImageData(maskImageData, 0, 0);

    // マスクを元画像座標にマッピングして描画
    // mask座標 → model座標 → 元画像座標
    // model_x = mask_x * (MODEL/MASK) → img_x = (model_x - padX) / scale
    const srcX = 0;
    const srcY = 0;
    const srcW = MASK_SIZE;
    const srcH = MASK_SIZE;

    const dstX = -padX / scale;
    const dstY = -padY / scale;
    const dstW = MODEL_INPUT_SIZE / scale;
    const dstH = MODEL_INPUT_SIZE / scale;

    // マスクの 160x160 → MODEL_INPUT_SIZE → 元画像サイズ にマッピング
    const finalDstX = dstX * (MASK_SIZE / MODEL_INPUT_SIZE) * (MODEL_INPUT_SIZE / MASK_SIZE);
    // 簡素化: マスクのスケール = MODEL/MASK * 1/scale
    const maskToImgScale = (MODEL_INPUT_SIZE / MASK_SIZE) / scale;

    ctx.drawImage(
      maskCanvas,
      srcX, srcY, srcW, srcH,
      -padX / scale, -padY / scale,
      MASK_SIZE * maskToImgScale, MASK_SIZE * maskToImgScale,
    );

    // バウンディングボックスの描画
    const bx1 = (det.x1 - padX) / scale;
    const by1 = (det.y1 - padY) / scale;
    const bx2 = (det.x2 - padX) / scale;
    const by2 = (det.y2 - padY) / scale;
    const bw = bx2 - bx1;
    const bh = by2 - by1;

    ctx.strokeStyle = getColorSolid(det.classId);
    ctx.lineWidth = 2;
    ctx.strokeRect(bx1, by1, bw, bh);

    // ラベル描画
    const label = `${det.className} ${(det.score * 100).toFixed(0)}%`;
    ctx.font = `bold ${Math.max(12, imgW / 50)}px Inter, sans-serif`;
    const textMetrics = ctx.measureText(label);
    const textH = Math.max(16, imgW / 40);

    ctx.fillStyle = getColorSolid(det.classId);
    ctx.fillRect(bx1, by1 - textH - 2, textMetrics.width + 8, textH + 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, bx1 + 4, by1 - 4);
  }
}

// ---- ユーティリティ ----

function nms(detections: Detection[], iouThreshold: number): Detection[] {
  // スコア降順でソート
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const keep: Detection[] = [];
  const suppressed = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;
    keep.push(sorted[i]);
    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue;
      if (sorted[i].classId !== sorted[j].classId) continue; // クラスごと NMS
      if (iou(sorted[i], sorted[j]) > iouThreshold) {
        suppressed.add(j);
      }
    }
  }
  return keep;
}

function iou(a: Detection, b: Detection): number {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  return intersection / (areaA + areaB - intersection + 1e-6);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
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

export { MODEL_INPUT_SIZE, MASK_SIZE };
