type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function RulesEditor({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-sm font-medium text-text mb-1.5 block">
        対話ルール
      </label>
      <p className="text-xs text-muted mb-2">
        対話の流れ・手順・禁止事項などを記述してください。
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/60 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
        placeholder={`1. まず挨拶してください\n2. ご用件を聞き取ってください\n3. 配達状況確認→check_deliveryツールを使用`}
      />
    </div>
  );
}
