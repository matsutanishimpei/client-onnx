import {
  NUM_CLASSES,
  NUM_MASK_COEFFS,
  MODEL_INPUT_SIZE,
  MASK_SIZE,
  nms,
  iou,
  hslToRgb,
  type Detection,
  type SegResult,
  postprocessYoloSeg as postprocessYoloSegUtils,
} from './yoloUtils';

export type { Detection, SegResult };
export { MODEL_INPUT_SIZE, MASK_SIZE };

/**
 * YOLOv8-seg の出力を後処理して検出結果 + マスクを返す
 * (後方互換性のためにラップして公開)
 */
export function postprocessYoloSeg(
  output0Data: Float32Array,
  output1Data: Float32Array,
  confThreshold = 0.25,
  iouThreshold = 0.45,
  labels: string[],
): SegResult {
  return postprocessYoloSegUtils(output0Data, output1Data, confThreshold, iouThreshold, labels);
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

    // HSL → RGB
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
    const maskToImgScale = (MODEL_INPUT_SIZE / MASK_SIZE) / scale;

    ctx.drawImage(
      maskCanvas,
      0, 0, MASK_SIZE, MASK_SIZE,
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
