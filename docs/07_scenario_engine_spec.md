# 07 シナリオエンジン仕様書

## 1. 概要

シナリオエンジンは通話中にリアルタイムで動作する状態機械（State Machine）。
シナリオ JSON を読み込み、ユーザーの発話・システムイベントに応じてノードを遷移させる。

## 2. ノードタイプ定義

### speak（発話）

```typescript
type SpeakNode = {
  id: string
  type: 'speak'
  data: {
    text: string        // 読み上げるテキスト（変数展開対応: {{name}}）
    speed: number       // 0.8〜1.5（デフォルト 1.0）
  }
  next: string          // 次ノードID
}
```

**動作:** `data.text` を変数展開 → Google TTS で音声合成 → Twilio に送信 → 完了後 `next` に遷移

---

### listen（ヒアリング）

```typescript
type ListenNode = {
  id: string
  type: 'listen'
  data: {
    variableName: string    // 認識結果を格納する変数名
    timeoutSeconds: number  // 無音タイムアウト（デフォルト 7）
    retryCount: number      // リトライ回数（デフォルト 2）
    retryText: string       // リトライ時の発話テキスト
  }
  next: string
  onTimeout: string         // タイムアウト時の遷移先ノードID
}
```

**動作:**

1. AmiVoice の認識結果を待機
2. 認識テキストを `session.variables[variableName]` に格納
3. `next` に遷移
4. タイムアウト時: `retryText` を読み上げてリトライ。上限到達後 `onTimeout` に遷移

---

### branch（分岐）

```typescript
type BranchNode = {
  id: string
  type: 'branch'
  data: {
    method: 'ai' | 'keyword'
    branches: Array<{
      id: string
      label: string          // 分岐ラベル（例: 「再配達」）
      keywords?: string[]    // keyword モード時のキーワード一覧
      nextNodeId: string
    }>
    aiPrompt?: string        // ai モード時の分類プロンプト補足
    defaultNextNodeId: string  // どの分岐にも該当しない場合
    inputVariable: string    // 分岐判定に使う変数名
  }
}
```

**AIモード動作:**

```
プロンプト:
  以下の発話内容を分類してください。
  発話: "{inputVariable の値}"
  分類ラベル: ["再配達", "配送確認", "その他"]
  {aiPrompt}
  必ず上記ラベルのいずれか1つのみをJSON {"label": "..."} で返してください。
```

**キーワードモード動作:** `inputVariable` の値に `keywords` のいずれかが含まれる場合に一致

---

### api_call（API連携）

```typescript
type ApiCallNode = {
  id: string
  type: 'api_call'
  data: {
    url: string              // 変数展開対応
    method: 'GET' | 'POST' | 'PUT'
    headers: Record<string, string>
    body?: Record<string, unknown>  // 変数展開対応
    responseMapping: Array<{
      jsonPath: string       // 例: "$.status"
      variableName: string
    }>
    timeoutMs: number        // デフォルト 5000
  }
  next: string
  onError: string            // エラー時の遷移先
}
```

---

### sms（SMS送信）

```typescript
type SmsNode = {
  id: string
  type: 'sms'
  data: {
    to: string      // 発信者番号を使う場合: "{{caller_number}}"
    body: string    // 変数展開対応
  }
  next: string
}
```

**動作:** Twilio Messages API で SMS を非同期送信（送信完了を待たずに `next` に遷移）

---

### transfer（転送）

```typescript
type TransferNode = {
  id: string
  type: 'transfer'
  data: {
    to: string          // 転送先電話番号（E.164）
    timeout: number     // 呼び出しタイムアウト秒（デフォルト 30）
    onNoAnswer: string  // 不在時の遷移先ノードID
  }
}
```

---

### end（終了）

```typescript
type EndNode = {
  id: string
  type: 'end'
  data: {
    farewell?: string   // 終了前に読み上げるテキスト（省略可）
  }
}
```

---

## 3. セッション状態

```typescript
type CallSession = {
  callSid: string
  tenantId: string
  scenarioId: string
  currentNodeId: string
  variables: Record<string, string>  // ヒアリング結果・API結果を蓄積
  retryCount: number                 // 現在ノードのリトライ回数
  status: 'active' | 'transferred' | 'ended' | 'error'
  startedAt: number                  // Unix timestamp
}
```

- Redis に `session:{callSid}` のキーで保存
- TTL: 3600秒（通話終了後も1時間保持）

---

## 4. 変数展開

テキスト内の `{{変数名}}` を `session.variables` の値で置き換える。

```typescript
function expandVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '')
}
```

**システム組み込み変数:**


| 変数名                 | 内容                |
| ------------------- | ----------------- |
| `{{caller_number}}` | 発信者番号             |
| `{{current_date}}`  | 現在日付（YYYY年MM月DD日） |
| `{{current_time}}`  | 現在時刻（HH:MM）       |


---

## 5. エラーハンドリング


| エラー種別              | 対処                                       |
| ------------------ | ---------------------------------------- |
| AmiVoice 接続失敗      | 「ただいま回線が混み合っております。後ほどおかけ直しください。」を読み上げて終了 |
| OpenAI タイムアウト（>3秒） | デフォルト分岐（`defaultNextNodeId`）に遷移          |
| API連携エラー           | `onError` ノードに遷移                         |
| 転送不在               | `onNoAnswer` ノードに遷移                      |
| シナリオ全体のエラー         | フォールバック: 「担当者に折り返しご連絡いたします。」を読み上げて終了     |


---

## 6. OpenAI プロンプト設計

### 意図分類プロンプト

```
system: |
  あなたは日本の物流会社のコールセンターAIです。
  発話内容を与えられた分類ラベルのいずれかに分類してください。
  必ず {"label": "<ラベル名>"} のJSONのみを返してください。

user: |
  発話: "{発話テキスト}"
  分類ラベル: {["ラベル1", "ラベル2", ...]}
  補足: {aiPrompt}
```

**モデル:** `gpt-4o-mini`（低レイテンシ・低コスト、分類タスクに十分）
**最大トークン:** 50
**temperature:** 0（決定論的な出力）

### 通話要約プロンプト（非同期）

```
system: |
  以下の通話内容を3行以内で要約してください。
  用件・ヒアリングした情報・対応結果を含めてください。

user: |
  {transcript_text}
```

**モデル:** `gpt-4o`（品質重視、非同期なのでレイテンシ不問）