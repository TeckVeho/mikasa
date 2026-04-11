# 10 バイブコーディングルール（AIへの指示原則）

## 言語・型

- TypeScript strict mode 必須（`"strict": true`）
- `any` 型禁止。不明な型は `unknown` を使用してから型ガードで絞り込む
- 関数の引数・戻り値は全て型定義
- 外部APIレスポンスは `zod` でバリデーション

## エラーハンドリング

- `throw` を使わない。Result 型パターンを徹底する

```typescript
type Result<T> = { ok: true; data: T } | { ok: false; error: string; code?: string }

// 使用例
async function fetchScenario(id: string): Promise<Result<Scenario>> {
  try {
    const scenario = await db.scenario.findUnique({ where: { id } })
    if (!scenario) return { ok: false, error: 'NOT_FOUND' }
    return { ok: true, data: scenario }
  } catch (e) {
    return { ok: false, error: 'DB_ERROR', code: String(e) }
  }
}
```

- `try/catch` は外部API呼び出し・DB操作のみ許可
- エラーは必ず上位に返し、握りつぶさない

## 関数設計

- 1関数1責務（20行を超えたら分割を検討）
- 副作用のある関数には動詞を含める（`fetchUser`, `saveScenario`, `publishScenario`）
- 純粋関数を優先する（状態に依存しない処理は pure に書く）

## コメント

- 「何を」ではなく「なぜ」を書く
- 自明なコードにコメントを付けない
- TODO コメントは `// TODO(name): 内容` 形式

---

## ディレクトリ構成

```
apps/
  web/                     # Next.js フロントエンド（App Router）
    app/
      (auth)/              # 認証関連ページグループ
        login/
          page.tsx
      (dashboard)/         # ログイン後ページグループ
        dashboard/
          page.tsx
        numbers/
          page.tsx
          [id]/page.tsx
        scenarios/
          page.tsx
          new/page.tsx
          [id]/edit/page.tsx
        calls/
          page.tsx
          [id]/page.tsx
        settings/
          page.tsx
      layout.tsx
      page.tsx
    components/
      ui/                  # shadcn/ui ベースの汎用UI
      scenario/            # シナリオエディタ専用（"use client" コンポーネント）
      dashboard/           # ダッシュボード専用
      calls/               # 通話ログ専用
      layout/              # レイアウト
    hooks/                 # カスタムフック（クライアント用）
    stores/                # Zustand ストア
    lib/
      api.ts               # Express API クライアント（fetch wrapper）
      auth.ts              # 認証ユーティリティ
    types/                 # フロントエンド型定義
  api/                     # Express バックエンド
    src/
      routes/              # Express ルート定義（薄く保つ）
      services/            # ビジネスロジック（テスト対象）
      repositories/        # DBアクセス（Prisma を直接叩く）
      lib/                 # 外部APIクライアント（AmiVoice, OpenAI, Twilio, TTS）
      types/               # 共通型定義
      utils/               # 純粋関数ユーティリティ
      app.ts               # Express アプリの初期化
      server.ts            # サーバー起動エントリーポイント
    prisma/
      schema.prisma
      migrations/
packages/
  shared/                  # フロント・バックエンド共通型
    src/
      types/               # ScenarioNode など共通型
      schemas/             # zod スキーマ
```

---

## 命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| Next.js ページ | `page.tsx`（App Router 規約） | `app/(dashboard)/calls/page.tsx` |
| コンポーネント | PascalCase | `ScenarioEditor`, `CallLogTable` |
| フック | camelCase + use prefix | `useScenario`, `useCallLogs` |
| 通常関数 | camelCase | `fetchScenario`, `buildPrompt` |
| 定数 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 型・インターフェース | PascalCase | `ScenarioNode`, `CallLog` |
| DBテーブル | snake_case | `call_logs`, `phone_numbers` |
| APIエンドポイント | kebab-case | `/api/scenarios/:id/publish` |
| 環境変数 | UPPER_SNAKE_CASE | `OPENAI_API_KEY`, `NEXT_PUBLIC_API_URL` |

### Next.js 固有の規約
- クライアントコンポーネントは先頭に `"use client"` を記述
- サーバーコンポーネントはデフォルト（`"use client"` なし）
- シナリオエディタ（React Flow）など重い UI は全て `"use client"`
- `NEXT_PUBLIC_` プレフィックスはクライアントに露出する環境変数のみに使用
- `loading.tsx` / `error.tsx` を各ルートセグメントに設置する

---

## AIへの指示原則

### タスクの粒度
- 1タスク = 1ファイル または 1機能（小さく区切って依頼する）
- 「全部作って」は禁止。ファイルパス・関数名・型名を具体的に指定する

### 実装の順序（必ず守る）
1. `packages/shared/src/types/` の型定義を先に作る
2. `apps/api/prisma/schema.prisma` を確定する
3. `apps/api/src/services/` を実装する
4. `apps/api/src/routes/` を実装する
5. `apps/web/` のページ・コンポーネントを実装する

### Next.js App Router の注意点
- データフェッチはできるだけ Server Component で行う（クライアント状態の最小化）
- `"use client"` はインタラクションが必要な最小単位のみに付ける
- シナリオエディタ（React Flow）・音声プレイヤーは必ず `"use client"`

### 既存コードの保護
- 既存ファイルを編集する前に必ず内容を確認してから着手する
- 破壊的変更（型変更・DBスキーマ変更）は事前に確認を求める
- `schema.prisma` を変更した場合は必ず `prisma migrate dev` の手順を示す

### テスト
- `services/` 層の関数には必ず単体テストを書く
- テストファイルは同一ディレクトリに `*.test.ts` として配置
- 外部API呼び出しは必ずモックする
- Express ルートの統合テストには `supertest` を使用

---

## 使用ライブラリ（変更禁止・追加は相談）

### バックエンド（Express）
| 用途 | ライブラリ |
|---|---|
| HTTPサーバー | `express` |
| WebSocket | `ws` |
| ORM | `prisma` |
| バリデーション | `zod` |
| 認証 | Firebase Admin SDK |
| ロギング | `pino` + `pino-http` |
| キュー | `bullmq` |
| テスト | `vitest` + `supertest` |

### フロントエンド（Next.js）
| 用途 | ライブラリ |
|---|---|
| フレームワーク | `next` (App Router) |
| UIコンポーネント | `shadcn/ui` |
| スタイリング | `tailwindcss` |
| フローエディタ | `reactflow` |
| グラフ | `recharts` |
| 状態管理（クライアント） | `zustand` |
| サーバー状態・キャッシュ | `@tanstack/react-query`（Client Component 内） |
| フォーム | `react-hook-form` + `zod` |
| 認証 | Firebase Auth（クライアント） |
| テスト | `vitest` + `@testing-library/react` |
