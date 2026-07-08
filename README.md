# Misaki（ミカサ金属 負荷計算システム）

泉北工場の製作工程・負荷管理を Web 化したシステムです。従来の Excel「泉北工程.xlsx」で行っていた工事管理・班別スケジュール・負荷可視化を、ブラウザ上で行えます。

モノレポ構成（Turborepo）で API・管理画面・共通パッケージを実装しています。

## 主な機能

| 画面 | パス | 説明 |
|------|------|------|
| ダッシュボード | `/dashboard` | 実績ベースの負荷グラフ（全体 / 工程別 / 班別） |
| 工事一覧 | `/projects` | 全班横断の KPI テーブル（Excel「表」シート相当） |
| 工事詳細 | `/projects/[id]` | 工程別実績・進捗・目標時間の管理 |
| 班別ビュー | `/teams/[id]` | 班シート形式の日次スケジュール・実績入力 |
| 過去実績 | `/historical` | 品種・班別の過去平均製作時間の参照 |
| 設定 | `/settings` | マスタ（品種・工程・班・カレンダー・キャパシティ） |

## 構成

| パッケージ | 説明 |
|-----------|------|
| `apps/api` | Express REST API（Prisma + MySQL） |
| `apps/web` | Next.js App Router 管理画面 |
| `packages/shared` | 共通型・負荷計算ロジック |

## 技術スタック

- **ランタイム**: Node.js 22+
- **フロントエンド**: Next.js 15, React 19, Tailwind CSS, Recharts
- **バックエンド**: Express, Prisma
- **DB**: MySQL 8
- **認証**: Firebase Authentication（開発時はヘッダーバイパス可）

## 前提

- Node.js 22+
- Docker（ローカル MySQL 用）

## セットアップ

```bash
npm install
cp .env.example .env
docker compose up -d
cd apps/api && npx prisma migrate deploy && npm run seed:dev && cd ../..
```

`.env` の `DATABASE_URL` は `docker-compose.yml` の MySQL 設定に合わせてください（デフォルト: `mysql://misaki:misaki@localhost:3306/misaki`）。

管理画面用の環境変数は [`apps/web/.env.example`](./apps/web/.env.example) を参照し、必要に応じて `apps/web/.env.local` を作成してください。

```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_USE_DEV_AUTH=true
NEXT_PUBLIC_DEV_TENANT_ID=01HZXEXAMPLE00000000000000
```

## 開発サーバー

```bash
# API + Web を同時起動
npm run dev:app

# 個別起動
npm run dev --workspace=@logivoice/api   # http://localhost:8080
npm run dev --workspace=@logivoice/web   # http://localhost:3010
```

### 開発用 API 認証（Firebase なし）

`apps/api` は `NODE_ENV !== production` のとき、`X-Dev-Tenant-Id` / `X-Dev-User-Id` ヘッダーで認証をバイパスできます。シードのデフォルトテナント ID は `01HZXEXAMPLE00000000000000` です（`SEED_TENANT_ID` で変更可）。

## スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run build` | 全パッケージビルド |
| `npm run dev` | 全パッケージの dev サーバー起動 |
| `npm run dev:app` | shared + api + web のみ起動 |
| `npm test` | テスト（Vitest） |
| `npm run typecheck` | 型チェック |
| `npm run lint` | Lint |

## ドキュメント

| ファイル | 内容 |
|---------|------|
| [`docs/負荷計算システム_要件サマリ.md`](./docs/負荷計算システム_要件サマリ.md) | 業務要件・エンティティ定義 |
| [`docs/泉北工程_仕様書.md`](./docs/泉北工程_仕様書.md) | 現行 Excel「泉北工程.xlsx」の仕様 |
| [`docs/改修計画_泉北工程Web化.md`](./docs/改修計画_泉北工程Web化.md) | Web 化の改修計画 |
| [`docs/過去12年工事記録平均時間_算出_仕様書.md`](./docs/過去12年工事記録平均時間_算出_仕様書.md) | 過去実績の算出ロジック |
| [`xlms/`](./xlms/) | 参照用の元 Excel ファイル |

## デプロイ

- **Web**: Vercel（[`vercel.json`](./vercel.json)）
- **API / DB**: Google Cloud（[`google-cloud/`](./google-cloud/)）
- **CI**: Cloud Build（[`cloudbuild.yaml`](./cloudbuild.yaml)）
