import { type SegResult } from './yoloUtils';

/**
 * YOLO Worker との通信を管理するクライアントクラス
 */
export class YoloWorkerClient {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingRequests = new Map<number, { resolve: (val: SegResult) => void; reject: (err: any) => void }>();

  constructor() {
    this.init();
  }

  private init() {
    // Vite の標準的な Worker 読み込み方式
    this.worker = new Worker(
      new URL('../workers/yoloWorker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (e) => {
      const { id, result, error, success } = e.data;
      const request = this.pendingRequests.get(id);

      if (request) {
        this.pendingRequests.delete(id);
        if (success) {
          request.resolve(result);
        } else {
          request.reject(new Error(error));
        }
      }
    };

    this.worker.onerror = (e) => {
      console.error('YoloWorkerClient: Worker error', e);
    };
  }

  /**
   * 後処理を Worker にリクエストする
   */
  async postprocess(
    output0: Float32Array,
    output1: Float32Array,
    confThreshold: number,
    iouThreshold: number,
    labels: string[]
  ): Promise<SegResult> {
    if (!this.worker) {
      throw new Error('Worker is not initialized');
    }

    const id = this.messageId++;
    
    return new Promise<SegResult>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Transferable Objects を使用してデータを渡す (バッファのコピーを回避)
      // 送信後、メインスレッド側で output0, output1 はアクセス不可になる
      this.worker!.postMessage({
        id,
        output0,
        output1,
        confThreshold,
        iouThreshold,
        labels,
      }, [output0.buffer, output1.buffer]);
    });
  }

  /**
   * Worker を破棄する
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.pendingRequests.clear();
    }
  }
}
