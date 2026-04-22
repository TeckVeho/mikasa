type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function KnowledgeEditor({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-sm font-medium text-text mb-1.5 block">
        業務ナレッジ
      </label>
      <p className="text-xs text-muted mb-2">
        業務に必要な知識をマークダウン形式で記述してください。
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={15}
        className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/60 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
        placeholder={`## 配達時間帯\n- 午前(8-12時)\n- 14-16時\n- 16-18時\n\n## 再配達について\n当日14時までの依頼なら当日対応可能`}
      />
    </div>
  );
}
