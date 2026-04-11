# 06 コンポーネント設計書

## 1. ディレクトリ構成

```
src/components/
  ui/                    # 汎用UIコンポーネント（shadcn/ui ベース）
    Button.tsx
    Input.tsx
    Badge.tsx
    Modal.tsx
    Toast.tsx
    Table.tsx
    Skeleton.tsx
    EmptyState.tsx
    ConfirmDialog.tsx
    DateRangePicker.tsx
  layout/                # レイアウトコンポーネント
    AppLayout.tsx        # サイドバー + メインコンテンツ
    Sidebar.tsx
    PageHeader.tsx
  scenario/              # シナリオエディタ専用
    ScenarioEditor.tsx   # エディタ全体のコンテナ
    NodePalette.tsx      # 左パネル（ノード一覧）
    PropertiesPanel.tsx  # 右パネル（プロパティ）
    nodes/
      SpeakNode.tsx
      ListenNode.tsx
      BranchNode.tsx
      ApiCallNode.tsx
      SmsNode.tsx
      TransferNode.tsx
      EndNode.tsx
  dashboard/
    KpiCard.tsx
    DailyCallsChart.tsx
    HourlyDistributionChart.tsx
  calls/
    CallLogTable.tsx
    TranscriptViewer.tsx
    AudioPlayer.tsx
    StructuredDataCard.tsx
```

## 2. 汎用UIコンポーネント

### Button

```typescript
type ButtonProps = {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  children: React.ReactNode
  onClick?: () => void
}
```


| variant   | 見た目         |
| --------- | ----------- |
| primary   | 青背景・白テキスト   |
| secondary | グレー背景・黒テキスト |
| danger    | 赤背景・白テキスト   |
| ghost     | 背景なし・テキストのみ |
| outline   | 枠線あり・背景なし   |


loading: true のとき、children をスピナーに置き換えて disabled にする

### Badge

```typescript
type BadgeProps = {
  variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info'
  children: React.ReactNode
}
```

### Modal

```typescript
type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  size?: 'sm' | 'md' | 'lg'  // デフォルト 'md'
  children: React.ReactNode
  footer?: React.ReactNode
}
```

- オーバーレイクリックで閉じる（破壊的操作を含む場合は `closeOnOverlayClick={false}`）
- ESC キーで閉じる
- フォーカストラップを実装

### EmptyState

```typescript
type EmptyStateProps = {
  illustration?: React.ReactNode  // SVGコンポーネント
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}
```

### ConfirmDialog

```typescript
type ConfirmDialogProps = {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description: string
  confirmLabel?: string       // デフォルト「確認」
  confirmVariant?: 'primary' | 'danger'  // デフォルト 'danger'
  isLoading?: boolean
}
```

---

## 3. シナリオエディタコンポーネント

### ScenarioEditor

エディタ全体のコンテナ。React Flow の `ReactFlowProvider` でラップ。

**状態管理（Zustand）:**

```typescript
type ScenarioEditorStore = {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
  isDirty: boolean           // 未保存の変更あり
  history: HistoryEntry[]    // Undo/Redo 用
  historyIndex: number
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  selectNode: (id: string | null) => void
  undo: () => void
  redo: () => void
  saveSnapshot: () => void   // 操作前に状態を保存
}
```

### 各ノードコンポーネント共通仕様

すべてのノードコンポーネントは以下の構造を持つ:

```tsx
// 例: SpeakNode.tsx
type SpeakNodeData = {
  text: string
  speed: number   // 0.8〜1.5
}

function SpeakNode({ data, selected }: NodeProps<SpeakNodeData>) {
  return (
    <div className={cn('node node-speak', { 'node--selected': selected })}>
      <Handle type="target" position={Position.Left} />
      <div className="node__header">
        <SpeakIcon />
        <span>発話</span>
      </div>
      <div className="node__body">
        <p className="node__preview">{data.text.slice(0, 30)}...</p>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
```

**ノードのサイズ:** 幅200px、高さ自動（最小80px）

### PropertiesPanel

選択中のノードIDに応じてプロパティフォームを切り替える:

```tsx
function PropertiesPanel({ selectedNodeId }: { selectedNodeId: string | null }) {
  const node = useNode(selectedNodeId)

  if (!node) return <EmptyPropertiesPanel />

  switch (node.type) {
    case 'speak':    return <SpeakProperties node={node} />
    case 'listen':   return <ListenProperties node={node} />
    case 'branch':   return <BranchProperties node={node} />
    case 'api_call': return <ApiCallProperties node={node} />
    case 'sms':      return <SmsProperties node={node} />
    case 'transfer': return <TransferProperties node={node} />
    case 'end':      return <EndProperties node={node} />
  }
}
```

プロパティの変更は即時にノードデータに反映（Undo スタックに追加）

---

## 4. AudioPlayer コンポーネント

```typescript
type AudioPlayerProps = {
  src: string | null
  transcriptItems: TranscriptItem[]  // 時刻付き発話リスト
  onSeek?: (timeSeconds: number) => void
}

type TranscriptItem = {
  startTime: number  // 秒
  speaker: 'system' | 'user'
  text: string
  isSuspicious?: boolean  // 誤認識の可能性
}
```

- `src` が null の場合、「録音データなし」を表示
- `transcriptItems` の各行をクリックするとその時刻にシーク

---

## 5. KpiCard コンポーネント

```typescript
type KpiCardProps = {
  title: string
  value: string | number
  unit?: string
  trend?: {
    value: number      // 変化量（正: 増加、負: 減少）
    isPositiveGood: boolean  // 増加が良い変化か（受電数: true, 転送数: false）
  }
  isLoading?: boolean
}
```

trend の表示:

- `isPositiveGood=true` かつ `trend.value > 0`: 緑の ↑ アイコン
- `isPositiveGood=true` かつ `trend.value < 0`: 赤の ↓ アイコン
- `isPositiveGood=false` かつ `trend.value > 0`: 赤の ↑ アイコン
- `isPositiveGood=false` かつ `trend.value < 0`: 緑の ↓ アイコン

