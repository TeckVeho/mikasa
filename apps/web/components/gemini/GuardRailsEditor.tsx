type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function GuardRailsEditor({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-sm font-medium text-text mb-1.5 block">
        ガードレール
      </label>
      <p className="text-xs text-muted mb-2">
        AIが絶対に守るべきルール・禁止事項・エスカレーション条件を記述してください。
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/60 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
        placeholder={`## ぜったいに守るルール\n- 料金の具体的な金額は伝えない\n- 判断に迷う場合は折り返し対応を提案する`}
      />
    </div>
  );
}
