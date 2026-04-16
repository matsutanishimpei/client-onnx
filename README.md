# AI Instance Segmentation Demo (client-onnx)

ブラウザ上で完結する最先端の Web AI 技術を駆使した、リアルタイム・インスタンスセグメンテーション・アプリケーションです。  
ONNX Runtime Web を基盤とし、YOLOv8n-seg モデルによる高速な物体検出とピクセル単位の分割（セグメンテーション）を実現しています。

## 🚀 主な機能

- **超高速リアルタイム推論**: 
  - WebGPU (優先) / WASM (フォールバック) バックエンドの自動選択。
  - Web Workers による後処理のオフロードで、UI スレッドをブロッキングせずに滑らかな動作を実現。
- **インスタンスセグメンテーション**: 
  - 画像またはカメラ映像から 80 クラスの COCO オブジェクトをピクセル単位で抽出。
- **推論履歴の永続化 (D1)**: 
  - 保存ボタン一つで、検出結果（メタデータ）を Cloudflare D1 データベースに保存し、履歴ページからいつでも確認可能。
- **PWA (Progressive Web App)**: 
  - 14MB の YOLO モデルや 27MB の WASM ランタイムを Service Worker で賢くキャッシュ。
  - オフライン対応済み。一度インストールすれば、電波のない場所でも起動・推論が可能。
- **プロダクト品質の堅牢性**: 
  - **セキュリティ**: Rate Limit, CORS 制限, Secure Headers による防御。
  - **監視**: フロントエンドの致命的なエラーをバックエンドへ自動報告するグローバルログシステム。
  - **型安全**: Zod スキーマを全層で共有し、Hono RPC による完全な型安全性を実現。

## 🛠 テクノロジースタック

- **Frontend**: React, Vite, TailwindCSS (Vanilla CSS 優先)
- **Backend**: Hono, Cloudflare Workers
- **Database**: Cloudflare D1
- **AI Runtime**: ONNX Runtime Web (WebGPU/WASM)
- **Validation/Types**: Zod, TypeScript
- **Testing**: Vitest

## 📦 セットアップ

### 前提条件

- Node.js 20 以上
- Cloudflare アカウント（D1 使用時）

### インストール

```bash
npm install
```

### ローカル開発

```bash
# 1. データベースの初期化 (初回のみ)
npx wrangler d1 migrations apply my-db --local

# 2. バックエンドサーバー起動 (Cloudflare Workers)
npm run dev:backend

# 3. フロントエンドサーバー起動 (Vite)
npm run dev:frontend
```

### ビルドと型チェック

```bash
# 型チェック
npm run typecheck

# テスト実行
npm run test

# フロントエンドのビルド (PWA アセット生成含む)
npm run build --workspace=@my-app/frontend
```

## 📂 ディレクトリ構成

このプロジェクトは `npm workspaces` を用いたモノレポ構成です。

- `packages/frontend`: UI、Worker クライアント、ONNX 推論ロジック。
- `packages/backend`: Hono API、D1 連携、セキュリティミドルウェア、エラーログ受信。
- `packages/shared`: 全パッケージで共有する Zod スキーマと型定義。
- `public/`: YOLOv8n-seg モデル、PWA アイコン、WASM ランタイム。

## 🛡 開発ルール

本プロジェクトでは `architecture.md` および AI エージェント用ルールに基づいた開発を徹底しています。
詳細は `.agent/rules/architecture.md` を参照してください。

## 📜 ライセンス

MIT

## 参考リンク

- [ONNX Runtime Web](https://onnxruntime.ai/)
- [Ultralytics YOLOv8](https://docs.ultralytics.com/)
- [Cloudflare Workers / Hono](https://hono.dev/)
