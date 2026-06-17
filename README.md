# AI Browser Inference Playground (client-onnx)

ブラウザ上で完結する、ONNX Runtime Web を活用したクライアントサイド AI 推論の実験・実装デモプロジェクトです。

---

## 💡 コンセプト：ブラウザ AI 推論の可能性

本プロジェクトは、**「ONNX Runtime Web がブラウザ上で動作すれば、適切な `.onnx` モデルと入出力の前後処理さえ用意すれば、あらゆる AI モデルをサーバーレスで実行できる」** というコンセプトを体現しています。

### 🌟 なぜブラウザでの AI 推論なのか？
- **完全ローカル動作 (プライバシー保護)**: 映像データや機密データが外部サーバーに送信されることはなく、ブラウザ内で完結します。
- **ゼロ・インフラコスト**: 高価な GPU サーバーや推論 API を維持する必要がなく、ユーザーデバイスの計算資源 (WebGPU / WASM) を活用します。
- **オフライン対応**: モデルファイルとアセットが一度キャッシュされれば、ネットワークのない環境でも AI 機能を利用できます。
- **多様なモデルのサポート**: Hugging Face などからダウンロードした `.onnx` 形式のモデル（行列計算、画像分類、セグメンテーション、自然言語処理など）を、統一されたランタイム上で実行可能です。

---

## 🚀 収録されているデモ

現在、本プロジェクトには以下の2つのデモが搭載されています：

1. **行列計算デモ (MatMul)**
   - 非常に軽量なカスタムモデル `model.onnx` を用いた、3×4 と 4×3 の行列掛け算。
   - ONNX Runtime Web が動作しているかを最小のオーバーヘッドで検証するためのヘルスチェック機能も兼ねています。
2. **リアルタイムカメラセグメンテーション (YOLOv8n-seg)**
   - 物体検出・セグメンテーションモデル `yolov8n-seg.onnx` (約14MB) を用いた、カメラ映像のリアルタイム解析。
   - **WebGPU バックエンド**（利用可能な場合）と **WASM バックエンド**（フォールバック）を自動で切り替え。
   - 重い後処理（マスク生成など）を **Web Workers** にオフロードし、UI スレッドをブロッキングせずに滑らかな描画を実現。

---

## 🛠 技術的なハイライト（Vite での ONNX Runtime Web 動作のコツ）

Vite 環境で `onnxruntime-web` の WASM/JSEP モジュール（ダイナミックインポートされる `.jsep.mjs` や `.wasm`）を動かす際、プレバンドルやビルドの解決ルールによって `no available backend found` エラーが発生しやすくなります。

本プロジェクトでは、以下のクリーンなアプローチでこの問題を解消しています：

- **Vite プリバンドルの除外**:
  `packages/frontend/vite.config.ts` で `onnxruntime-web` および `onnxruntime-web/webgpu` を `optimizeDeps.exclude` に指定。
  ```typescript
  optimizeDeps: {
    exclude: ['onnxruntime-web', 'onnxruntime-web/webgpu']
  }
  ```
- **アセットパス設定の廃止**:
  以前必要とされていた `ort.env.wasm.wasmPaths = '/wasm/'` のような手動コピーと手動パス解決コードを完全に撤廃しました。プリバンドルから除外することで、ONNX Runtime Web が `node_modules` から必要な WASM や MJS モジュールを自動的に正しい相対パスでロードできるようになりました。

---

## 📂 ディレクトリ構成

本プロジェクトは `npm workspaces` を用いたモノレポ構成です（バックエンドなしのフロントエンド完結型）。

- `packages/frontend`: React + Vite + Vanilla CSS による UI、Worker クライアント、ONNX 推論ロジック。
- `packages/shared`: UI と推論処理、またテストコード間で共有する型定義（TypeScript）。

---

## 📦 セットアップと実行

### 前提条件
- Node.js 20 以上

### インストール
```bash
npm install
```

### ローカル開発サーバーの起動
```bash
npm run dev:frontend
```
起動後、ブラウザで [http://localhost:5173/](http://localhost:5173/) にアクセスします。

### その他のコマンド
```bash
# 型チェック
npm run typecheck

# ユニットテストの実行 (Vitest)
npm run test

# フロントエンドのビルド
npm run build
```

---

## 📜 ライセンス
MIT

## 参考リンク
- [ONNX Runtime Web](https://onnxruntime.ai/)
- [Ultralytics YOLOv8](https://docs.ultralytics.com/)
- [Hugging Face (ONNXモデルの探索)](https://huggingface.co/)
