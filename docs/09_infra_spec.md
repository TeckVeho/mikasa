# 09 インフラ・環境構成書

## 1. GCP リソース構成

```
プロジェクト: logivoice-prod / logivoice-dev
リージョン: asia-northeast1（東京）

Cloud Run
  ├── logivoice-web（Next.js フロントエンド）
  ├── logivoice-api（Express バックエンドAPI + WebSocket）
  └── logivoice-worker（非同期処理ワーカー）

Cloud SQL
  └── PostgreSQL 15（db-g1-small、dev は db-f1-micro）

Cloud Memorystore
  └── Redis 7.0（Basic Tier 1GB）

Cloud Storage
  └── logivoice-recordings-{project-id}（通話録音）

Cloud Pub/Sub
  └── topic: call-completed（通話完了イベント）
  └── subscription: summarize-worker

Firebase
  └── Authentication（メール/パスワード認証）

Cloud Scheduler
  └── call-log-cleanup（毎日0時、90日以上前のログを削除）
```

## 2. Cloud Run 設定

### logivoice-web（Next.js）

| 設定 | 値 |
|---|---|
| メモリ | 512MB |
| CPU | 1 vCPU |
| 最小インスタンス数 | 1（コールドスタート回避） |
| 最大インスタンス数 | 20 |
| リクエストタイムアウト | 60秒 |
| 環境変数 | `NEXT_PUBLIC_API_URL`, `NEXTAUTH_SECRET` など |

### logivoice-api（Express）

| 設定 | 値 |
|---|---|
| メモリ | 512MB |
| CPU | 1 vCPU |
| 最小インスタンス数 | 1（コールドスタート回避） |
| 最大インスタンス数 | 100 |
| リクエストタイムアウト | 3600秒（WebSocket 長期接続のため） |
| 同時実行数 | 80（WebSocket 接続数を考慮） |
| 環境変数 | Secret Manager 経由で注入 |

### logivoice-worker

| 設定 | 値 |
|---|---|
| メモリ | 256MB |
| CPU | 1 vCPU |
| 最小インスタンス数 | 0（コスト節約） |
| 最大インスタンス数 | 10 |

## 3. 環境変数一覧

### Express API（logivoice-api）
```env
# DB
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Firebase Admin（JWT検証用）
FIREBASE_PROJECT_ID=logivoice-prod
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxx
TWILIO_AUTH_TOKEN=xxxxxx
TWILIO_WEBHOOK_URL=https://api.logivoice.jp/webhooks/twilio/voice

# AmiVoice
AMIVOICE_APP_KEY=xxxxxx

# OpenAI
OPENAI_API_KEY=sk-xxxxxx

# Google Cloud
GOOGLE_CLOUD_PROJECT=logivoice-prod
GCS_BUCKET_NAME=logivoice-recordings-prod

# App
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
```

### Next.js フロントエンド（logivoice-web）
```env
# API エンドポイント（クライアントから参照）
NEXT_PUBLIC_API_URL=https://api.logivoice.jp

# Firebase Auth（クライアント）
NEXT_PUBLIC_FIREBASE_API_KEY=xxxxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=logivoice-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=logivoice-prod

# Next.js
NEXTAUTH_SECRET=xxxxxx
NODE_ENV=production
```

**機密情報は Cloud Secret Manager で管理**（環境変数への直接記述禁止）

## 4. CI/CD パイプライン

```
[GitHub]
    │ push to main
    ▼
[Cloud Build]
    ├── 1. テスト実行（vitest）
    ├── 2. 型チェック（tsc --noEmit）
    ├── 3. Docker イメージビルド（web / api それぞれ）
    ├── 4. Artifact Registry に push
    ├── 5. Cloud Run にデプロイ（logivoice-web / logivoice-api）
    └── 6. Prisma Migrate 実行（マイグレーションあれば）
```

**ブランチ戦略:**
- `main` → 本番（logivoice-prod）
- `develop` → 開発（logivoice-dev）
- feature/* → PR 作成後に develop にマージ

## 5. モニタリング・アラート

| 項目 | ツール | しきい値 |
|---|---|---|
| エラー率 | Cloud Monitoring | 5xx が 1%超で通知 |
| レイテンシ | Cloud Monitoring | P99 が 5秒超で通知 |
| WebSocket 接続数 | カスタムメトリクス | 80% 超で通知 |
| DB 接続数 | Cloud SQL | 80% 超で通知 |
| OpenAI コスト | カスタムメトリクス | 月予算の 80% で通知 |

**ログ:** Cloud Logging に JSON 形式で出力（構造化ログ）

## 6. バックアップ

| データ | バックアップ方法 | 頻度 |
|---|---|---|
| Cloud SQL | 自動バックアップ | 毎日（7日間保持） |
| Cloud Storage（録音） | バージョニング無効、ライフサイクルで90日後削除 | - |
| シナリオデータ | DB バックアップに含む | 毎日 |
