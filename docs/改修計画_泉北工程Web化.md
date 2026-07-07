# 泉北工程 Web化 改修計画

> **方針**: 新原寸山積予定は利用せず、泉北工程のみをWeb化する
> **ベース**: 現行 Misaki システム（Next.js + Express + Prisma + MySQL）
> **入力デバイス**: PC のみ

---

## 0. 改修の全体像

```
【削除/凍結】原寸系の機能
  - ProjectPhase（期間1〜4）
  - DailyAllocation（計画配分）
  - expandProject / stacking-chart（計画ベース山積み）
  - stackingRequired フラグ

【改修】既存画面の作り替え
  - /projects        → 表シート再現（KPI テーブル）
  - /projects/[id]   → 期間1〜4 を削除、工程別実績を強化
  - /dashboard       → 負荷棒グラフ（実績ベース）に置換
  - /teams/[id]      → Excel ブロック形式で再現

【新規】
  - 負荷グラフコンポーネント（全体/工程別/班別 の3ビュー）
  - 班シート画面（工事ブロック + 日次カレンダー + D&D 予定変更）

【削除】
  - 日報入力（/daily-input）— 班シートの日次カレンダー直接編集に一本化

【そのまま】
  - 過去実績（/historical）
  - 設定（/settings）
  - 認証・テナント基盤
```

---

## 1. DB スキーマ改修

### 1.1 削除するモデル

| モデル | 理由 |
|--------|------|
| `ProjectPhase` | 原寸の期間1〜4 概念。泉北では不使用 |
| `DailyAllocation` | 原寸の計画配分。負荷グラフは ProcessRecord ベースに変更 |

### 1.2 Project テーブルの変更

```prisma
model Project {
  // 削除するフィールド
  // stackingRequired  Boolean  ← 不要（全工事が対象）
  // phases            ProjectPhase[]  ← 削除
  // dailyAllocations  DailyAllocation[]  ← 削除

  // 既存フィールド（そのまま）
  id, tenantId, projectNumber, clientName, projectName,
  productTypeId, deadline, weight, drawingReceivedAt,
  plannedHours, weldingRatio, teamId, status,
  category, sortOrder, createdAt, updatedAt, deletedAt

  // 追加フィールド
  setCount         Int?      @map("set_count")            // SET数（基数）
  detail           String?   @db.VarChar(500)              // 詳細（重量・SET数・補足）
  pastAverageHours Decimal?  @map("past_average_hours") @db.Decimal(8, 1)  // 過去平均時間（参照表示用）
}
```

### 1.3 ProcessRecord（変更なし）

現行の `ProcessRecord`（工事×工程×日付→時間）がメインデータとして適合。変更不要。

```
ProcessRecord: projectId × processTypeId × date → hours
```

### 1.4 マイグレーション手順

```
1. Project に setCount, detail, pastAverageHours を追加
2. Project から stackingRequired を削除
3. ProjectPhase テーブルを DROP
4. DailyAllocation テーブルを DROP
```

---

## 2. 画面改修計画

### 画面1: 工事一覧（表シート再現）— `/projects`

**対応する Excel**: 泉北工程.xlsx「表」シート

#### 改修内容

現在の工事一覧（9列）を、表シートの KPI テーブル（23列）に作り替える。

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [班フィルタ: 全班 ▼]  [ステータス: shipped 非表示]  [工事登録] [CSVインポート]         │
├────┬───────┬────────────┬──────┬──────┬─────┬─────┬──────┬──────────────┬──────────────┤
│ 班 │ 工番  │ 工事名,納期 │目標h │全体  │ 差  │W割合│進捗% │ 鍛冶        │ 溶接         │
│    │       │            │      │実数  │     │(入力)│     │目標|実数|差  │目標|実数|差   │
├────┼───────┼────────────┼──────┼──────┼─────┼─────┼──────┼──────────────┼──────────────┤
│    │       │            │      │      │     │     │      │ 組前│組立│溶接│歪取│塗装│仕上│
├────┼───────┼────────────┼──────┼──────┼─────┼─────┼──────┼────┼────┼────┼────┼────┼────┤
│    │       │            │      │      │     │     │      │過去平均│予想完了│予想vs目標   │
└────┴───────┴────────────┴──────┴──────┴─────┴─────┴──────┴────┴────┴────┴────┴────┴────┘
```

#### 列定義（表シート完全再現）

| # | 列名 | 元 | 算出方法 |
|---|------|-----|---------|
| 1 | 班 | Project.team.name | JOIN |
| 2 | 工番 | Project.projectNumber | — |
| 3 | 工事名,納期 | projectName + deadline | 結合表示 |
| 4 | 目標時間 | Project.plannedHours | — |
| 5 | 全体実数 | SUM(ProcessRecord.hours) | 集計 |
| 6 | 差 | 目標時間 - 全体実数 | 計算 |
| 7 | W割合 | Project.weldingRatio | **インライン編集可** |
| 8 | 進捗% | 全体実数 ÷ 目標時間 × 100 | 計算 |
| 9 | 鍛冶目標 | 目標時間 - 溶接目標 | 計算 |
| 10 | 鍛冶実数 | 全体実数 - 溶接実数 | 計算 |
| 11 | 鍛冶差 | 鍛冶目標 - 鍛冶実数 | 計算 |
| 12 | 溶接目標 | 目標時間 × W割合 | 計算 |
| 13 | 溶接実数 | SUM(ProcessRecord WHERE isWelding) | 集計 |
| 14 | 溶接差 | 溶接目標 - 溶接実数 | 計算 |
| 15-20 | 組前/組立/溶接/歪取り/塗装/仕上げ | 各工程の SUM(hours) | 集計 |
| 21 | 過去平均 | Project.pastAverageHours or HistoricalAverage | 参照 |
| 22 | 予想完了時間 | 全体実数 ÷ 進捗% × 100 | 計算 |
| 23 | 予想vs目標差 | 目標時間 - 予想完了時間 | 計算 |

#### API 改修

`GET /v1/projects` のレスポンスに集計フィールドを追加:

```typescript
type ProjectListItemDto = {
  // 既存
  id, projectNumber, projectName, teamId, teamName,
  deadline, plannedHours, weldingRatio, status,

  // 追加
  totalActualHours: number;      // 全体実数
  variance: number;              // 差
  progressRate: number;          // 進捗%
  forgingTarget: number;         // 鍛冶目標
  forgingActual: number;         // 鍛冶実数
  weldingTarget: number;         // 溶接目標
  weldingActual: number;         // 溶接実数
  processSummary: Record<string, number>;  // 工程別実績
  pastAverageHours: number | null;
  forecastHours: number | null;  // 予想完了時間
  forecastVariance: number | null;
};
```

#### フロント改修ポイント

- `status !== "shipped"` のフィルタをデフォルト ON
- W割合のインライン編集（クリック → input → blur で保存）
- 差がマイナスの場合に赤色表示
- 班フィルタはセレクトボックス

---

### 画面2: 過去実績参照（モデルシート）— `/historical` 改修

**対応する Excel**: 泉北工程.xlsx「モデル」シート

#### 改修内容

現在の `/historical` 画面はほぼそのまま活用可能。追加するのは:

1. **品種選択 → 過去平均の自動表示**（既存の `lookupHistoricalAverage` を活用）

工程別目標の配分比率は過去実績から取得せず、回帰式で算出した過去平均時間に工程マスタの固定比率を掛ける（泉北工程.xlsx と同様）。そのため過去実績画面に工程別比率の表示は不要。

```
┌─────────────────────────────────────────────────────────┐
│ 品種: [箱型 ▼]                                         │
│                                                         │
│ 過去平均時間: 811h                                      │
│                                                         │
│ [過去実績テーブル]（既存のまま）                           │
└─────────────────────────────────────────────────────────┘
```

#### 自動提案ロジック（後日実装）

工事登録・編集時に品種を選ぶと `plannedHours` に過去平均を自動セットする機能は将来対応。
現時点では参照情報として表示するのみ。

---

### 画面3: 班別工数管理（班シート再現）— `/teams/[id]` 大改修

**対応する Excel**: 泉北工程.xlsx「中野班」「道姓班」「阪上班」シート

#### 改修内容

現在のシンプルなテーブル表示を、**Excel の工事ブロック形式**に作り替える。

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 中野班  [表示期間: 2026/07 ◀ ▶]                                                 │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ ┌─ 251004 養老IC 小倉高架橋P2B ──────────────────────────────────────────────┐  │
│ │ 状況: 製作中  客先: ○○建設  重量: 12.5t  SET数: 2                          │  │
│ │                                                                              │  │
│ │         目標h   実績h   比率%  │  7/1  7/2  7/3  7/4 ... 7/31              │  │
│ │ 組立前   134.1   119     89%  │   8    8    4         ...                   │  │
│ │ 組立      89.8    42     47%  │             3    5   ...                   │  │
│ │ 溶接     109.1    33     30%  │                  2   ...                   │  │
│ │ 歪取り    29.6     0      0%  │                      ...                   │  │
│ │ 塗装      39.2     0      0%  │                      ...                   │  │
│ │ 仕上げ   138.8     0      0%  │                      ...                   │  │
│ │ ──────────────────────────────┼──────────────────────────────────────────  │  │
│ │ 小計     540.6   194     36%  │ 過去平均: 811h                             │  │
│ └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│ ┌─ 24Z009 養老IC大垣高架橋BR1P10 ────────────────────────────────────────────┐  │
│ │ ...（次の工事ブロック）                                                      │  │
│ └──────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### 工事ブロックの構成（1工事 = 1カード）

```
行0: 工事ヘッダー（工番, 工事名+納期, 状況, 客先, 重量, SET数）
行1: 組立前  [目標h] [実績h] [比率%] | 日次カレンダー入力セル...
行2: 組立    [目標h] [実績h] [比率%] | 日次カレンダー入力セル...
行3: 溶接    [目標h] [実績h] [比率%] | 日次カレンダー入力セル...
行4: 歪取り  [目標h] [実績h] [比率%] | 日次カレンダー入力セル...
行5: 塗装    [目標h] [実績h] [比率%] | 日次カレンダー入力セル...
行6: 仕上げ  [目標h] [実績h] [比率%] | 日次カレンダー入力セル...
行7: 小計    [合計]  [合計]  [全体%] | 過去平均 / 累積
```

※「製造予定」「営業予定」の2行は除外

#### 日次カレンダーの仕様

- **表示範囲**: デフォルト **1ヶ月分**（起点月の1日〜末日）。表の**左右両端**をドラッグして表示幅を広げ、**最大3ヶ月**まで連続表示可能
- **セル幅**: 表示月数が増えるほど日次セルは狭くなる（`カレンダー領域の幅 ÷ 日数` で均等縮小）。セル幅が下限（例: 24px）を下回る場合は**横スクロールを併用**し、入力・D&D の操作性を維持する
- **月送り（◀▶）**: **起点月**の移動のみ（表示幅は維持）。例: 起点7月・幅3ヶ月 → 7/1〜9/30。◀で起点6月 → 6/1〜8/31
- **表示幅の永続化**: ユーザーの表示月数（1〜3）は `localStorage` に保存し、次回訪問時に復元
- 月境界には区切り線＋月ラベル（「7月」「8月」）をヘッダー行に表示
- 各セルは数値入力可能（既存 ProcessRecord の upsert と同じ仕組み）
- **日次実績入力のメイン画面**: Excel の班シートと同様、ここで直接入力する（独立した日報入力画面は廃止）
- **今日列のハイライト**: 当日の列を強調表示し、表示範囲に当日が含まれる場合は自動スクロール + 「今日へ」ボタン
- 休日列はグレーアウト（Calendar テーブル参照）
- **ドラッグ&ドロップ**: 入力済みの時間セルを別の日付にドラッグして予定日変更（表示範囲を跨いでも可）

```
表示幅の操作イメージ:

  1ヶ月（デフォルト）  │←── 表左端 ──│ 7月 ████████████ │── 表右端 ──→│
  2ヶ月（右端ドラッグ）│←── 表左端 ──│ 7月 ██████│8月 ██████ │── 表右端 ──→│
  3ヶ月（最大）        │← 左端ドラッグ│7月│8月│9月 │ 右端ドラッグ →│
                       ※ セルが下限未満 → 横スクロール併用
```

#### D&D 予定日変更の仕組み

```
1. セルの値をドラッグ開始 → 元セルの date/processTypeId/hours を保持
2. ドロップ先のセル（別日付）に放す
3. API 呼び出し:
   - DELETE 元の ProcessRecord
   - UPSERT 新しい ProcessRecord（新日付 + 同 hours）
4. UI をオプティミスティック更新
```

#### API

```
GET  /v1/teams/:id/schedule?month=2026-07&months=1|2|3
  → 班の全工事ブロック + 起点月から連続 N ヶ月分の日次 ProcessRecord + Calendar
  → month: 起点月（YYYY-MM）、months: 表示月数（デフォルト 1、最大 3）

POST /v1/teams/:id/schedule/move
  body: { projectId, processTypeId, fromDate, toDate, hours }
  → ProcessRecord の日付変更
```

#### コンポーネント設計

```
TeamSchedulePage
├── MonthNavigator（◀ 起点月: 2026年7月 ▶）  ← 起点月のみ移動、表示幅は維持
├── ScheduleWidthResizer（表左端・右端のドラッグハンドル、1〜3ヶ月）
├── ProjectBlock × N（アコーディオンで展開/折りたたみ可能）
│   ├── ProjectBlockHeader（工番, 工事名, 状況, 客先）
│   ├── ProcessRow × 6（工程ごとの目標/実績/比率 + 日次セル）
│   │   └── DayCell × N日（入力/D&D 対応、幅は表示月数に応じて縮小）
│   └── SubtotalRow（小計, 過去平均）
└── CalendarHeader（日付 + 月区切り + 休日マーク）
```

---

### 画面4: 負荷グラフ（ダッシュボード）— `/dashboard` 改修

**対応する Excel**: 泉北工程.xlsx「配信用グラフ」「実績と3ヵ月予報」

#### 改修内容

現在の山積みグラフ（DailyAllocation ベース）を、**ProcessRecord ベースの実績棒グラフ**に置換。
3つのビューをタブ切り替えで提供。

```
┌─────────────────────────────────────────────────────────────────┐
│ ダッシュボード                                                   │
│                                                                  │
│ [KPI カード: 進行中工事 | 遅延リスク | 平均進捗率 | 今月負荷率]   │
│                                                                  │
│ ┌─ 負荷グラフ ─────────────────────────────────────────────────┐ │
│ │ [全体] [工程別] [班別]   期間: [2026/07 ▼] 〜 [2026/09 ▼]   │ │
│ │                                                               │ │
│ │  ▌全体ビュー▐                                                │ │
│ │    各日の合計実績時間の棒グラフ                                │ │
│ │    + 定時ペースライン（破線）                                  │ │
│ │    + 2H残業ライン（破線）                                     │ │
│ │                                                               │ │
│ │  ▌工程別ビュー▐                                              │ │
│ │    積み上げ棒グラフ（組前|組立|溶接|歪取り|塗装|仕上げ）       │ │
│ │    日次 or 週次集計                                            │ │
│ │                                                               │ │
│ │  ▌班別ビュー▐                                                │ │
│ │    班ごとの棒グラフ（月次）                                    │ │
│ │    + ペースライン                                              │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [アラート]                                                       │
└─────────────────────────────────────────────────────────────────┘
```

#### 3つのグラフビュー

| ビュー | X軸 | Y軸 | 系列 | データソース |
|--------|------|------|------|-------------|
| 全体 | 日付 | 時間(h) | 全工事合計 | SUM(ProcessRecord.hours) GROUP BY date |
| 工程別 | 日付 | 時間(h) | 6工程（積み上げ） | SUM(hours) GROUP BY date, processTypeId |
| 班別 | 月 | 時間(h) | 各班（並列棒） | SUM(hours) GROUP BY month, teamId |

#### ペースライン

`CapacitySetting` から取得（既存テーブルを活用）:
- 定時間ライン: `regularHoursPerDay × headcount`
- 2H残業ライン: `overtime2hPerDay × headcount`

#### API

```
GET /v1/dashboard/load-chart?start=2026-07-01&end=2026-09-30&view=total|process|team
```

#### 新しい DTO

```typescript
type LoadChartDto = {
  dates: string[];
  series: {
    key: string;      // "total" | processTypeId | teamId
    label: string;    // "全体" | "組立前" | "中野班"
    values: number[]; // 日次 or 月次の時間
  }[];
  paceLines: { label: string; value: number }[];
};
```

---

## 3. 削除するコード一覧

### API（apps/api）

| ファイル | 対象 | 操作 |
|---------|------|------|
| `services/stacking-chart.service.ts` | 全体 | 削除（新 load-chart に置換） |
| `services/project.service.ts` | `updatePhases()`, `expandProject()`, `listAllocations()`, `updateAllocations()` | 関数削除 |
| `routes/projects.route.ts` | `/:id/phases`, `/:id/expand`, `/:id/allocations`, `/stacking-chart` | ルート削除 |

### Web（apps/web）

| ファイル | 対象 | 操作 |
|---------|------|------|
| `app/(dashboard)/projects/[id]/page.tsx` | 「期間1〜4」セクション + 「日次展開」ボタン | 削除 |
| `components/charts/StackingChart.tsx` | 全体 | 削除（新 LoadChart に置換） |
| `lib/load-api.ts` | `expandProject()`, `updatePhases()`, `fetchStackingChart()` | 削除 |

### Shared（packages/shared）

| ファイル | 対象 | 操作 |
|---------|------|------|
| `types/load-calculation.ts` | `ProjectPhaseDto`, `DailyAllocationDto`, `AllocationSource`, `StackingChartDto`, `StackingChartSeriesDto` | 削除 |
| `types/load-calculation.ts` | `ProjectDto.stackingRequired`, `ProjectDto.phases` | フィールド削除 |

---

## 4. 新規作成ファイル一覧

| ファイル | 内容 |
|---------|------|
| `apps/api/services/load-chart.service.ts` | ProcessRecord ベースの負荷グラフデータ生成 |
| `apps/api/routes/load-chart.route.ts` | `/v1/dashboard/load-chart` エンドポイント |
| `apps/api/services/team-schedule.service.ts` | 班スケジュールデータ取得 + D&D 移動 |
| `apps/api/routes/team-schedule.route.ts` | `/v1/teams/:id/schedule` エンドポイント |
| `apps/web/components/charts/LoadChart.tsx` | 新しい棒グラフ（全体/工程別/班別タブ） |
| `apps/web/components/team/ProjectBlock.tsx` | 工事ブロック（工程行 + 日次セル） |
| `apps/web/components/team/DayCell.tsx` | 日次入力セル（D&D 対応） |
| `apps/web/components/team/MonthNavigator.tsx` | 起点月送りコンポーネント |
| `apps/web/components/team/ScheduleWidthResizer.tsx` | 表左右端ドラッグで表示月数（1〜3）を変更 |
| `packages/shared/src/types/load-calculation.ts` | `LoadChartDto`, `TeamScheduleDto` 追加 |

---

## 5. 実行フェーズ

### Phase A: DB + 削除（破壊的変更）

```
所要: 0.5日
1. Prisma マイグレーション（フィールド追加 → モデル削除）
2. 原寸系の API / Service / Route を削除
3. shared types の整理
4. seed データの更新
```

### Phase B: 工事一覧（表シート再現）

```
所要: 1日
1. project.service の listProjects を改修（集計フィールド追加）
2. /projects ページの UI を表シート形式に作り替え
3. W割合のインライン編集
4. shipped 非表示フィルタ
```

### Phase C: 負荷グラフ（ダッシュボード）

```
所要: 1日
1. load-chart.service 新規作成
2. LoadChart コンポーネント（3ビュー + タブ切り替え）
3. /dashboard ページの改修
4. ペースライン表示
```

### Phase D: 班別工数管理（班シート再現）

```
所要: 2〜3日（D&D が重い）
1. team-schedule.service 新規作成
2. ProjectBlock / DayCell コンポーネント
3. /teams/[id] ページの大改修
4. D&D 実装（@dnd-kit or react-beautiful-dnd）
5. CalendarHeader + 休日表示
6. 月送りナビゲーション（起点月の ◀▶）
7. 表示幅リサイズ（左右両端ドラッグ、1〜3ヶ月、セル下限時は横スクロール併用）
8. 今日列ハイライト + 自動スクロール（日次入力導線）
9. /daily-input の廃止（/teams へリダイレクト、サイドバーは班別ビューに差し替え）
```

### Phase E: 結合テスト + 微調整

```
所要: 0.5日
1. 画面間の整合性確認
2. seed データで表示確認
3. パフォーマンスチェック（大量工事時）
```

---

## 6. 依存関係と実行順序

```
Phase A（DB + 削除）
  ↓ 必須
Phase B（工事一覧）─────┐
Phase C（負荷グラフ）────┤ 並列実行可能
Phase D（班シート）──────┘
  ↓ 全完了後
Phase E（結合テスト）
```

Phase B/C/D は Phase A 完了後に並列実行可能。

---

## 7. 技術選定メモ

| 要素 | 採用 | 理由 |
|------|------|------|
| 棒グラフ | Recharts（既存） | 現行で Area/Line を使用済み。BarChart を追加するだけ |
| D&D | `@dnd-kit/core` + `@dnd-kit/sortable` | React 18 対応、軽量、Grid/Table の D&D に強い |
| 日次カレンダー | 自前実装 | 班シート特有のレイアウトのため、ライブラリより自前が自然 |
| インライン編集 | contentEditable or input toggle | W割合の1セルだけなので軽量実装 |
