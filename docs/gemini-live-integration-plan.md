# LogiVoice Gemini Live 統合 — 実装計画書

## 1. 概要

### 1.1 目的

現行の3段パイプライン（AmiVoice STT → OpenAI LLM → Google TTS）を、Google Gemini 3.1 Flash Live のネイティブ Speech-to-Speech に置き換え、レイテンシの大幅削減とAI主導の自然な対話を実現する。

### 1.2 方針

- テナント単位で「フロー型（現行）」と「Gemini Live型」を切り替え可能にする
- 既存のフローエディタ・パイプラインは残し、並行稼働させる
- 有人転送は Twilio REST API によるリダイレクト方式
- Phase 1 では Vertex AI RAG Engine は使わず、System Instruction + Function Calling で構築
- Gemini Live 障害時は即座にオペレーター転送にフォールバック

### 1.3 アーキテクチャ

```
【現行 フロー型】
  Twilio → WS → AmiVoice(STT) → scenario-engine → OpenAI(LLM) → Google TTS → Twilio

【新 Gemini Live型】
  Twilio → WS → リサンプル(8k→16k) → Gemini Live API(STT+LLM+TTS一体)
                                              ↓ function calling
                                        配送API / 顧客DB / Twilio転送
                                              ↓
  Twilio ← リサンプル(24k→8k) + μ-law変換 ← Gemini Live API
```

### 1.4 設計方針

| 項目 | 決定事項 |
|---|---|
| 移行戦略 | テナントごとに「フロー型」か「Gemini Live型」を選択可能 |
| ナレッジ: ペルソナ | system instruction 全文を自由編集 |
| ナレッジ: 対話ルール | テキストエディタで自由記述 |
| ナレッジ: 業務ナレッジ | マークダウンで自由記述 |
| ナレッジ: ツール定義 | JSON スキーマを直接編集 |
| ナレッジ: RAG | Phase 1 では不使用。①+②+③のみ |
| 音声 | テスト済み推奨音声を固定 |
| テスト通話 | ブラウザからのテスト通話機能あり |
| コスト管理 | 不要 |
| フォールバック | 即座にオペレーター転送 |
| 既存データ | マイグレーションツールで新形式に変換 |

---

## 2. ナレッジの4層アーキテクチャ

```
┌─ ① System Instruction（静的ナレッジ）───────────────┐
│  テナントDB → ペルソナ名、会社名、営業時間            │
│  Scenario → 対話フロー、分岐ルール、ガードレール       │
│  サイズ: ~3,000〜5,000 トークン / セッション           │
└──────────────────────────────────────────────────────┘

┌─ ② Initial Context (send_client_content) ───────────┐
│  Twilio start → 発信者番号                            │
│  DB照会 → 顧客名、VIPフラグ、直近注文                 │
│  CallLog → 直近3件の通話要約                          │
│  サイズ: ~500〜1,000 トークン / セッション             │
└──────────────────────────────────────────────────────┘

┌─ ③ Function Calling（リアルタイムのナレッジ取得）────┐
│  check_delivery / schedule_redelivery / request_pickup │
│  lookup_customer / send_sms / transfer_to_operator    │
│  ツール数: 6〜10個                                    │
└──────────────────────────────────────────────────────┘
```

---

## 3. DB スキーマ拡張

```prisma
model Tenant {
  // 既存フィールドに追加
  voiceEngine        String   @default("flow")   // "flow" | "gemini_live"
}

model GeminiScenario {
  id                 String   @id @default(cuid())
  scenarioId         String   @unique
  scenario           Scenario @relation(fields: [scenarioId], references: [id])
  persona            String   @db.Text
  conversationRules  String   @db.Text
  businessKnowledge  String   @db.Text
  guardRails         String   @db.Text
  toolDefinitions    Json     @default("[]")
  voiceName          String   @default("Aoede")
  languageCode       String   @default("ja-JP")
  transferEnabled    Boolean  @default(true)
  transferNumber     String?
  transferTimeout    Int      @default(30)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model TransferHandoff {
  id                 String   @id @default(cuid())
  callLogId          String?
  callLog            CallLog? @relation(fields: [callLogId], references: [id])
  tenantId           String
  callSid            String
  callerNumber       String
  reason             String   @db.Text
  collectedInfo      Json?
  transcript         String?  @db.Text
  priority           String   @default("normal")
  department         String   @default("general")
  status             String   @default("pending")
  createdAt          DateTime @default(now())
}
```

---

## 4. 有人転送フロー

```
Gemini が transfer_to_operator を呼ぶ
  ↓
Gemini:「オペレーターにお繋ぎいたします」（発話完了を待つ）
  ↓
サーバーが TransferHandoff を DB 保存
  ↓
Twilio REST API: calls(callSid).update({ url: "/webhooks/twilio/transfer" })
  ↓
Gemini セッション終了
  ↓
Twilio が /webhooks/twilio/transfer を呼ぶ
  ↓ <Dial timeout="30">
  ├─ 応答あり → オペレーターと通話
  └─ 不在 → action URL → 折り返し案内 + callbacks テーブルに登録
```

Gemini Live 障害時: 即座にオペレーター転送にフォールバック

---

## 5. ファイル変更マップ

### 新規作成

| ファイル | 説明 |
|---|---|
| `apps/api/prisma/migrations/20260423_gemini_live/migration.sql` | マイグレーション |
| `apps/api/src/repositories/gemini-scenario.repo.ts` | リポジトリ |
| `apps/api/src/services/gemini-scenario.service.ts` | サービス |
| `apps/api/src/routes/gemini-scenarios.route.ts` | API ルート |
| `apps/api/src/lib/gemini-live.ts` | Gemini Live WebSocket クライアント |
| `apps/api/src/utils/resample.ts` | 音声リサンプラー |
| `apps/api/src/services/prompt-builder.ts` | プロンプトビルダー |
| `apps/api/src/services/tool-dispatcher.ts` | ツール実行ディスパッチャ |
| `apps/api/src/ws/gemini-call.handler.ts` | Gemini 用コールハンドラ |
| `apps/api/src/services/call-transfer.ts` | 転送サービス |
| `apps/api/src/ws/test-call.handler.ts` | テスト通話ハンドラ |
| `apps/api/src/services/flow-to-gemini-migrator.ts` | マイグレーションツール |
| `apps/web/app/(dashboard)/scenarios/[id]/gemini/page.tsx` | Gemini 設定ページ |
| `apps/web/components/gemini/PersonaEditor.tsx` | ペルソナエディタ |
| `apps/web/components/gemini/RulesEditor.tsx` | ルールエディタ |
| `apps/web/components/gemini/KnowledgeEditor.tsx` | ナレッジエディタ |
| `apps/web/components/gemini/ToolDefinitionEditor.tsx` | ツール定義エディタ |
| `apps/web/components/gemini/PromptPreview.tsx` | プロンプトプレビュー |
| `apps/web/components/gemini/TransferSettings.tsx` | 転送設定 |
| `apps/web/components/gemini/TestCallDialog.tsx` | テスト通話ダイアログ |
| `apps/web/lib/audio-worklet.ts` | AudioWorklet |
| `apps/web/lib/test-call-ws.ts` | テスト通話 WS クライアント |

### 改修

| ファイル | 変更内容 |
|---|---|
| `apps/api/prisma/schema.prisma` | Tenant.voiceEngine + GeminiScenario + TransferHandoff |
| `apps/api/src/app.ts` | gemini-scenarios ルート登録 |
| `apps/api/src/server.ts` | /test-call WebSocket パス追加 |
| `apps/api/src/ws/call-stream.handler.ts` | voiceEngine 分岐 |
| `apps/api/src/routes/webhooks/twilio.route.ts` | transfer / transfer-result |
| `apps/api/src/routes/settings.route.ts` | voiceEngine 切り替え |
| `apps/web/app/(dashboard)/scenarios/[id]/edit/page.tsx` | Gemini/フロー分岐 |
| `apps/web/app/(dashboard)/settings/page.tsx` | voiceEngine セレクタ |
| `apps/web/app/(dashboard)/callbacks/page.tsx` | TransferHandoff 表示 |
| `apps/web/components/layout/Sidebar.tsx` | ナビゲーション |

---

## 6. 環境変数

```bash
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-3.1-flash-live-preview
GEMINI_VOICE=Aoede
```

## 7. 依存パッケージ

```bash
npm install @google/genai   # apps/api
```
