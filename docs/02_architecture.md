# 02 システムアーキテクチャ設計書

## 1. 全体構成図

```
[エンドユーザー（電話）]
         │
         ▼
    [Twilio]  ←──── 電話番号取得・PSTN接続
         │
         │ WebSocket（音声ストリーム）+ Webhook（イベント）
         ▼
[Cloud Run: Backend API]
         │
    ┌────┼────────────────────┐
    ▼    ▼                    ▼
[AmiVoice] [OpenAI GPT-4o] [Google TTS]
  (STT)    (意図解釈/応答生成) (TTS)
    │         │                │
    └────┬────┘                │
         ▼                    │
  [ScenarioEngine]            │
    (状態機械)                │
         │◄────────────────── ┘
         │
    ┌────┴────┐
    ▼         ▼
[Cloud SQL] [Cloud Memorystore]
(PostgreSQL) (Redis: セッション状態)
    │
    ▼
[Cloud Storage]
(録音ファイル)

[管理者ブラウザ]
    │
    ▼
[Cloud Run: Next.js Frontend]
    │
    ▼
[Cloud Run: Express API]  ← 別サービス
    │
    ▼
[Cloud SQL]
```

## 2. コンポーネント責務


| コンポーネント                   | 責務                                 |
| ------------------------- | ---------------------------------- |
| Twilio                    | PSTN接続・電話番号管理・WebSocket音声ストリーム     |
| Cloud Run (Backend)       | API処理・WebSocket処理・ScenarioEngine実行 |
| AmiVoice                  | 日本語音声→テキスト変換（STT）                  |
| OpenAI GPT-4o             | 発話意図の分類・自然言語での応答生成                 |
| Google TTS                | テキスト→音声変換（TTS）、日本語自然音声             |
| ScenarioEngine            | シナリオJSON に従った対話状態遷移                |
| Cloud SQL (PostgreSQL)    | テナント・シナリオ・通話ログの永続化                 |
| Cloud Memorystore (Redis) | 通話中のセッション状態・キュー                    |
| Cloud Storage             | 通話録音ファイル（90日保持）                    |
| Cloud Run (Next.js)       | 管理画面フロントエンドのホスティング                 |
| Cloud Pub/Sub             | 非同期処理（要約生成・SMS送信）のキュー              |


## 3. 通話処理データフロー

```
1. 着信
   Twilio → POST /webhooks/twilio/voice
   → TwiML レスポンス（<Stream> タグ）でWebSocket接続を指示

2. 音声ストリーム開始
   Twilio → WebSocket ws://backend/call-stream
   → CallSession を Redis に作成（callSid をキーに）

3. リアルタイム音声処理ループ
   a. Twilio から mulaw 8kHz の音声チャンクを受信
   b. AmiVoice WebSocket API に転送
   c. AmiVoice から認識テキストを受信
   d. ScenarioEngine に入力
   e. ScenarioEngine が現在ノードを評価
      - 発話ノード → Google TTS → Twilio に音声を送信
      - ヒアリングノード → 次の発話を待機
      - 分岐ノード → OpenAI に意図分類を依頼 → 次ノードを決定
      - API連携ノード → 外部API呼び出し → 結果を変数に格納
      - 転送ノード → Twilio Dial で転送
      - 終了ノード → 通話終了
   f. セッション状態を Redis に更新

4. 通話終了
   → 通話ログを PostgreSQL に保存
   → 録音ファイルを Cloud Storage に保存
   → Pub/Sub に要約生成タスクを発行（非同期）

5. 非同期処理（Cloud Run worker）
   → Pub/Sub からタスクを受信
   → OpenAI で通話内容を要約
   → 要約を PostgreSQL に保存
```

## 4. 管理画面データフロー

```
ブラウザ → Firebase Auth でJWT取得
        → REST API に Authorization: Bearer {jwt} を付与して呼び出し
        → Backend で JWT を検証 → テナントIDを取得
        → PostgreSQL からテナントのデータを取得・返却
```

## 5. セキュリティ境界

- すべての通信は HTTPS/WSS
- API は JWT 必須（Firebase Auth）
- テナントIDをすべてのDBクエリに含める（行レベルセキュリティ）
- AmiVoice/OpenAI への音声・テキストデータはリクエスト完了後に破棄
- 録音ファイルは Cloud Storage の署名付きURL でのみアクセス可能（有効期限1時間）

## 6. スケーリング方針


| 課題              | 対策                                       |
| --------------- | ---------------------------------------- |
| 通話増加            | Cloud Run の自動スケールアウト（最大100インスタンス）        |
| DB接続過多          | Cloud SQL Proxy + コネクションプーリング（pgBouncer） |
| WebSocket の長期接続 | インスタンスあたり最大100接続を想定、それ以上はスケールアウト         |
| レイテンシ           | Cloud Run をasia-northeast1（東京）に配置        |


