# 03 API仕様書

## 1. 基本仕様

| 項目 | 内容 |
|---|---|
| ベースURL | `https://api.logivoice.jp/v1` |
| 認証 | `Authorization: Bearer {Firebase JWT}` |
| Content-Type | `application/json` |
| エラー形式 | `{ "ok": false, "error": "ERROR_CODE", "message": "説明" }` |
| 成功形式 | `{ "ok": true, "data": { ... } }` |

## 2. 認証

### POST /auth/verify
JWT を検証してテナント情報を返す（主にフロントエンドの初期化時に使用）

**Response**
```json
{
  "ok": true,
  "data": {
    "userId": "usr_xxx",
    "tenantId": "tnt_xxx",
    "role": "admin"
  }
}
```

---

## 3. 電話番号

### GET /numbers
電話番号一覧を取得

**Response**
```json
{
  "ok": true,
  "data": [
    {
      "id": "num_xxx",
      "number": "+81312345678",
      "scenarioId": "scn_xxx",
      "scenarioName": "再配達受付",
      "status": "active",
      "monthlyCallCount": 142,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### POST /numbers
新規番号を取得・追加

**Request**
```json
{ "twilioNumberSid": "PNxxxxxx" }
```

### DELETE /numbers/:id
番号を解約・削除

### PATCH /numbers/:id/scenario
シナリオを紐づける

**Request**
```json
{ "scenarioId": "scn_xxx" }
```

### PATCH /numbers/:id/status
稼働状態を切り替える

**Request**
```json
{ "status": "active" | "inactive" }
```

### GET /numbers/available
Twilio から取得可能な番号リストを返す

---

## 4. シナリオ

### GET /scenarios
シナリオ一覧

**Response**
```json
{
  "ok": true,
  "data": [
    {
      "id": "scn_xxx",
      "name": "再配達受付",
      "status": "published",
      "linkedNumberCount": 3,
      "updatedAt": "2026-04-01T10:00:00Z"
    }
  ]
}
```

### POST /scenarios
新規作成

**Request**
```json
{
  "name": "再配達受付",
  "flowJson": { ... }
}
```

### GET /scenarios/:id
シナリオ詳細（flowJson を含む）

### PUT /scenarios/:id
シナリオ全体を更新（エディタからの保存）

**Request**
```json
{
  "name": "再配達受付",
  "flowJson": { ... }
}
```

### POST /scenarios/:id/publish
シナリオを公開状態にする

### POST /scenarios/:id/duplicate
シナリオを複製する

### DELETE /scenarios/:id
シナリオを削除

---

## 5. 通話ログ

### GET /calls
通話ログ一覧（フィルタ・ページネーション対応）

**Query Parameters**
| パラメータ | 型 | 説明 |
|---|---|---|
| page | number | ページ番号（デフォルト1） |
| limit | number | 件数（デフォルト50、最大100） |
| from | ISO8601 | 開始日時 |
| to | ISO8601 | 終了日時 |
| status | string | complete/transferred/abandoned |
| numberId | string | 電話番号ID でフィルタ |
| q | string | 文字起こし全文検索 |

**Response**
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "call_xxx",
        "callerNumber": "+819012345678",
        "receiverNumberId": "num_xxx",
        "duration": 183,
        "status": "complete",
        "summaryText": "再配達希望。翌日14〜16時希望。",
        "createdAt": "2026-04-11T14:32:00Z"
      }
    ],
    "total": 1234,
    "page": 1,
    "limit": 50
  }
}
```

### GET /calls/:id
通話ログ詳細（文字起こし・構造化データ含む）

**Response**
```json
{
  "ok": true,
  "data": {
    "id": "call_xxx",
    "callerNumber": "+819012345678",
    "duration": 183,
    "status": "complete",
    "transcriptText": "...",
    "summaryText": "...",
    "structuredData": {
      "name": "山田太郎",
      "address": "東京都渋谷区...",
      "preferredDatetime": "2026-04-12 14:00-16:00",
      "purpose": "redelivery"
    },
    "audioUrl": "https://storage.googleapis.com/...",
    "scenarioId": "scn_xxx",
    "operatorNote": "",
    "createdAt": "2026-04-11T14:32:00Z"
  }
}
```

### PATCH /calls/:id/note
オペレーターメモを更新

---

## 6. ダッシュボード

### GET /dashboard/summary
KPI サマリー

**Query Parameters**: `period` = today | week | month | custom（from, to 必須）

**Response**
```json
{
  "ok": true,
  "data": {
    "totalCalls": 342,
    "completionRate": 0.73,
    "avgDuration": 142,
    "transferCount": 92,
    "prevPeriodComparison": {
      "totalCalls": 0.12,
      "completionRate": 0.05
    }
  }
}
```

### GET /dashboard/daily-calls
日別受電数（折れ線グラフ用）

### GET /dashboard/hourly-distribution
時間帯別受電分布（棒グラフ用）

---

## 7. Twilio Webhook（内部）

### POST /webhooks/twilio/voice
着信イベント。TwiML を返す。

### POST /webhooks/twilio/status
通話ステータス変更イベント。

---

## 8. WebSocket

### WS /call-stream
Twilio の MediaStream を受信するエンドポイント。

**受信イベント（Twilio → Backend）**
```json
{ "event": "connected" }
{ "event": "start", "start": { "callSid": "CA...", ... } }
{ "event": "media", "media": { "payload": "<base64 mulaw>" } }
{ "event": "stop" }
```

**送信イベント（Backend → Twilio）**
```json
{ "event": "media", "media": { "payload": "<base64 mulaw 音声>" } }
{ "event": "clear" }
```

---

## 9. エラーコード一覧

| コード | HTTP | 説明 |
|---|---|---|
| UNAUTHORIZED | 401 | JWT が無効または期限切れ |
| FORBIDDEN | 403 | テナント外リソースへのアクセス |
| NOT_FOUND | 404 | リソースが存在しない |
| VALIDATION_ERROR | 422 | リクエストボディの形式不正 |
| SCENARIO_PUBLISH_FAILED | 422 | シナリオにエラーがあり公開できない |
| TWILIO_ERROR | 502 | Twilio API エラー |
| AMIVOICE_ERROR | 502 | AmiVoice API エラー |
| OPENAI_ERROR | 502 | OpenAI API エラー |
| INTERNAL_ERROR | 500 | 内部サーバーエラー |
