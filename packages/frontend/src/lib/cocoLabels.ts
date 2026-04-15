/**
 * COCO 80 クラスのラベル名
 * YOLOv8 の出力クラス番号 (0〜79) に対応
 */
export const COCO_LABELS: string[] = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
  'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book',
  'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
];

/**
 * クラスごとのカラーパレット (HSL ベース)
 * 色相を 80 クラスに均等に分散し、彩度・明度を固定
 */
export function getClassColor(classId: number, alpha = 0.5): string {
  const hue = (classId * 137.5) % 360; // 黄金角で色相を分散
  return `hsla(${hue}, 75%, 55%, ${alpha})`;
}

export function getClassColorSolid(classId: number): string {
  const hue = (classId * 137.5) % 360;
  return `hsl(${hue}, 75%, 55%)`;
}
