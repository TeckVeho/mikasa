type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function PersonaEditor({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-sm font-medium text-text mb-1.5 block">
        ペルソナ設定
      </label>
      <p className="text-xs text-muted mb-2">
        AIアシスタントの人格・口調・役割を自由に記述してください。
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/60 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
        placeholder={`あなたは「XX社」の電話受付AIアシスタント「ゆうこ」です。\n丁寧で明るい話し方をし、お客様のお困りごとを解決します。`}
      />
    </div>
  );
}
