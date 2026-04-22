import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  text: string;
  loading: boolean;
};

export function PromptPreview({ text, loading }: Props) {
  return (
    <div>
      <label className="text-sm font-medium text-text mb-1.5 block">
        システムプロンプト プレビュー
      </label>
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <textarea
          readOnly
          value={text}
          rows={12}
          className="w-full resize-y rounded-lg border border-border bg-base px-3 py-2 font-mono text-xs text-muted outline-none"
          placeholder="プレビューボタンを押すと、組み立て後のシステムプロンプトが表示されます。"
        />
      )}
    </div>
  );
}
