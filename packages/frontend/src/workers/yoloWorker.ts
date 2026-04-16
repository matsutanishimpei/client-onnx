import { postprocessYoloSeg } from '../lib/yoloUtils';

/**
 * YOLOv8 Post-processing Worker
 */
self.onmessage = async (e: MessageEvent) => {
  const {
    output0,
    output1,
    confThreshold,
    iouThreshold,
    labels,
    id, // リクエスト識別用 ID
  } = e.data;

  try {
    // 後処理の実行
    const result = postprocessYoloSeg(
      output0,
      output1,
      confThreshold,
      iouThreshold,
      labels
    );

    // メインスレッドに結果を返す
    // masks (Float32Array[]) の各バッファを Transferable として登録することで高速化
    const transferableBuffers = result.masks
      .filter((m): m is Float32Array => m instanceof Float32Array)
      .map(m => m.buffer);

    self.postMessage({
      id,
      result,
      success: true,
    }, transferableBuffers as any);

  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
      success: false,
    });
  }
};
