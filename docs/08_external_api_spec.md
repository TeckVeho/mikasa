# 08 外部API連携仕様書

## 1. Twilio

### 着信 Webhook

着信時に Twilio が `POST /webhooks/twilio/voice` を呼び出す。
以下の TwiML を返すことで WebSocket ストリームを開始する。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://api.logivoice.jp/call-stream" />
  </Connect>
</Response>
```

### WebSocket メッセージ形式

**Twilio → Backend（受信）**
```json
// 接続確立
{ "event": "connected", "protocol": "Call", "version": "1.0.0" }

// ストリーム開始
{
  "event": "start",
  "sequenceNumber": "1",
  "start": {
    "callSid": "CAxxxxxx",
    "streamSid": "MZxxxxxx",
    "accountSid": "ACxxxxxx",
    "tracks": ["inbound"],
    "mediaFormat": { "encoding": "audio/x-mulaw", "sampleRate": 8000, "channels": 1 }
  }
}

// 音声データ
{
  "event": "media",
  "sequenceNumber": "2",
  "media": {
    "track": "inbound",
    "chunk": "1",
    "timestamp": "5",
    "payload": "<base64 encoded mulaw audio>"
  }
}

// ストリーム終了
{ "event": "stop", "sequenceNumber": "100", "stop": { "callSid": "CAxxxxxx" } }
```

**Backend → Twilio（送信）**
```json
// 音声送信
{
  "event": "media",
  "streamSid": "MZxxxxxx",
  "media": { "payload": "<base64 encoded mulaw audio>" }
}

// 再生中の音声をキャンセル
{ "event": "clear", "streamSid": "MZxxxxxx" }
```

### 音声フォーマット変換

AmiVoice/Google TTS は mulaw 8kHz 以外のフォーマットを扱うため変換が必要:

| 変換 | ライブラリ | 説明 |
|---|---|---|
| mulaw → PCM16 | `@twilio-labs/plugin-media-streams` | AmiVoice への入力用 |
| PCM16 → mulaw | `ffmpeg` or `audiobuffer-to-wav` | Twilio への返送用 |

### レート制限
- Twilio WebSocket: 接続ごとに制限なし（同時通話数はアカウントプランに依存）
- Twilio REST API: 1秒あたり100リクエスト

---

## 2. AmiVoice Cloud Platform

### WebSocket 接続（リアルタイムSTT）

**エンドポイント:** `wss://acp-api.amivoice.com/v1/recognize`

**接続時の認証:**
```
wss://acp-api.amivoice.com/v1/recognize?u={AMIVOICE_APP_KEY}&a=-a-general
```

**送信フォーマット:**
```
s <audio_format>   # セッション開始（例: "s lsb8k"）
p <base64_audio>   # 音声データ送信（PCM16 / 8kHz / mono）
e                  # 認識終了
```

**受信フォーマット:**
```json
// 認識中（中間結果）
{ "type": "C", "text": "再配達をお願いしたいのですが" }

// 認識確定（最終結果）
{ "type": "A", "text": "再配達をお願いしたいのですが", "confidence": 0.95 }
```

**エンジン選択:** `-a-general`（汎用会話エンジン）

**実装上の注意:**
- 通話1件につき WebSocket 接続を1本確立・維持する
- `type: "A"` の確定結果のみをシナリオエンジンに渡す
- 接続切断時は指数バックオフで最大3回再接続を試みる

---

## 3. OpenAI API

### 意図分類（同期・低レイテンシ）

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
    { role: 'user', content: userInput }
  ],
  max_tokens: 50,
  temperature: 0,
  response_format: { type: 'json_object' }
})
```

**タイムアウト:** 3000ms（超過時はデフォルト分岐に遷移）

### 通話要約（非同期）

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
    { role: 'user', content: transcriptText }
  ],
  max_tokens: 300,
  temperature: 0.3
})
```

**レート制限対策:**
- exponential backoff で最大3回リトライ
- 同時リクエスト数を環境変数で制御（デフォルト: 10）

---

## 4. Google Cloud TTS

### テキスト→音声変換

```typescript
const [response] = await ttsClient.synthesizeSpeech({
  input: { text: expandedText },
  voice: {
    languageCode: 'ja-JP',
    name: 'ja-JP-Neural2-B',  // 女性、自然な日本語
    ssmlGender: 'FEMALE'
  },
  audioConfig: {
    audioEncoding: 'LINEAR16',
    sampleRateHertz: 8000,   // Twilio 向けに 8kHz
    speakingRate: speed       // 0.8〜1.5
  }
})
// response.audioContent が PCM16 バイナリ
```

**音声キャッシュ:**
- 固定テキスト（変数展開なし）は Redis に音声をキャッシュ（TTL 24時間）
- キャッシュキー: `tts:{sha256(text)}:{speed}`
- キャッシュヒット率を上げるためテキストの正規化（全角→半角など）を適用

---

## 5. 外部API 共通エラーハンドリング

```typescript
type ExternalApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: 'TIMEOUT' | 'RATE_LIMIT' | 'AUTH_ERROR' | 'UNKNOWN'; message: string }

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 500
): Promise<ExternalApiResult<T>> {
  // 指数バックオフ実装
}
```

| エラー種別 | 対処 |
|---|---|
| TIMEOUT | バックオフ後リトライ、上限到達でフォールバック |
| RATE_LIMIT | 1秒待機後リトライ |
| AUTH_ERROR | リトライなし、管理者にアラート送信 |
| UNKNOWN | バックオフ後リトライ、ログ記録 |
