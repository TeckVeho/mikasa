# LogiVoice（物流向け電話自動対応 AI）

モノレポ構成（Turborepo）で API・管理画面・ワーカーを実装しています。

## 構成

| パッケージ | 説明 |
|-----------|------|
| `apps/api` | Express + WebSocket（Twilio Media Stream / シナリオエンジン） |
| `apps/web` | Next.js App Router（管理画面） |
| `apps/worker` | Pub/Sub コンシューマ（通話要約など） |
| `packages/shared` | 共通型・Zod スキーマ |

## 前提

- Node.js 22+
- Docker（ローカル MySQL / Redis 用）

## セットアップ

```bash
npm install
cp .env.example .env
# .env の DATABASE_URL を docker-compose の MySQL に合わせる（例: localhost:3306）
docker compose up -d
cd apps/api && npx prisma migrate deploy && cd ../..
```

### 開発用 API 認証（Firebase なし）

`apps/api` は `NODE_ENV !== production` のとき、`X-Dev-Tenant-Id` / `X-Dev-User-Id` で認証をバイパスできます。

```bash
cd apps/api && DATABASE_URL=... npx prisma db seed
```

シードのデフォルトテナント ID は `01HZXEXAMPLE00000000000000` です（`SEED_TENANT_ID` で変更可）。

管理画面は `apps/web/.env.local` に以下を設定してください（[`apps/web/.env.example`](./apps/web/.env.example) を参照）。

```
NEXT_PUBLIC_USE_DEV_AUTH=true
NEXT_PUBLIC_DEV_TENANT_ID=01HZXEXAMPLE00000000000000
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 開発サーバー

```bash
# API
npm run dev --workspace=@logivoice/api

# Web（別ターミナル）
npm run dev --workspace=@logivoice/web
```

## スクリプト

- `npm run build` — 全パッケージビルド
- `npm test` — テスト（Vitest）
- `npm run typecheck` — 型チェック

## ドキュメント

要件・設計は [`docs/`](./docs/) を参照してください。
