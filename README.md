# client-onnx

ブラウザだけで動く ONNX Runtime Web のデモアプリです。  
現在は以下の 3 つのデモを収録しています。

- MatMul（行列乗算の最小例）
- YOLOv8n-seg 画像インスタンスセグメンテーション
- YOLOv8n-seg リアルタイムカメラ推論（WebGPU 優先 / WASM フォールバック）

## デモ内容

### 1) MatMul デモ

`/model.onnx` を使って行列 `A x B` を実行し、推論時間を表示します。  
ONNX Runtime Web の基本フロー（セッション作成 -> 入力テンソル生成 -> 推論）を確認できます。

### 2) 画像セグメンテーション

`/yolov8n-seg.onnx` で画像を推論し、検出ボックスとマスクを描画します。

- サンプル画像選択
- ファイルアップロード / ドラッグ&ドロップ
- 信頼度閾値スライダー
- 推論ステージごとの処理時間表示

### 3) リアルタイムカメラ推論

カメラ映像を連続推論し、オーバーレイ表示します。

- WebGPU が利用可能なら自動選択
- 非対応環境では WASM で動作
- FPS / 推論時間 / 検出数を HUD 表示
- 前面/背面カメラ切り替え

## セットアップ

### 前提

- Node.js 20 以上推奨
- npm

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
# Backend (Cloudflare Workers / Hono)
npm run dev:backend

# Frontend (Vite)
npm run dev:frontend
```

Frontend は通常 `http://localhost:5173` で起動します。

### 型チェック

```bash
npm run typecheck
```

## ディレクトリ構成

このリポジトリは npm workspaces のモノレポです。

- `packages/frontend`: React + Vite の UI と ONNX 推論実装
- `packages/backend`: Hono + Wrangler（API/Workers 側）
- `packages/shared`: 共有型・スキーマ置き場
- `.agent/rules`: AI エージェント向けの開発ルール

## 注意事項

- ONNX モデルは `packages/frontend/public` 配下に配置しています。
- リアルタイム推論は端末性能とブラウザ実装に依存します。
- カメラ機能は HTTPS または localhost 環境での利用を推奨します。

## 参考リンク

- [ONNX Runtime Web](https://onnxruntime.ai/)
- [Ultralytics YOLOv8](https://docs.ultralytics.com/)
