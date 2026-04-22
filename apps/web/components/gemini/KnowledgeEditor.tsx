"use client";

import { useRef, useState } from "react";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { apiFormData } from "@/lib/api";

type Props = {
  value: string;
  onChange: (value: string) => void;
  scenarioId?: string;
};

const ACCEPT = ".pdf,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv";

export function KnowledgeEditor({ value, onChange, scenarioId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("ファイルサイズが上限（10MB）を超えています");
      return;
    }

    setError(null);
    setUploading(true);
    setLastFile(file.name);

    try {
      if (scenarioId) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("mode", "replace");

        const r = await apiFormData<{ knowledge: string; extractedLength: number }>(
          `/v1/scenarios/${scenarioId}/gemini/upload-knowledge`,
          formData,
        );

        if (r.ok) {
          onChange(r.data.knowledge);
        } else {
          setError(r.message ?? r.error);
        }
      } else {
        const text = await readFileAsText(file);
        if (text) {
          onChange(`## ${file.name}\n\n${text}`);
        } else {
          setError("ファイルからテキストを抽出できませんでした");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="text-sm font-medium text-text mb-1.5 block">
        業務ナレッジ
      </label>
      <p className="text-xs text-muted mb-3">
        業務に必要な知識を記述するか、ファイルをアップロードしてください。
      </p>

      {/* Upload area */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-text disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
        >
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              テキスト抽出中...
            </>
          ) : (
            <>
              <Upload size={16} />
              PDF / TXT / Markdown / CSV をアップロード
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {lastFile && !error && !uploading && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          <FileText size={16} className="shrink-0" />
          <span className="font-medium">{lastFile}</span> からテキストを抽出しました
        </div>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={15}
        className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/60 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
        placeholder={`## 配達時間帯\n- 午前(8-12時)\n- 14-16時\n- 16-18時\n\n## 再配達について\n当日14時までの依頼なら当日対応可能`}
      />
      <p className="mt-1.5 text-xs text-muted">
        アップロード後もテキストを手動で編集できます。保存ボタンで確定してください。
      </p>
    </div>
  );
}

async function readFileAsText(file: File): Promise<string | null> {
  if (file.type === "application/pdf") {
    return null;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string)?.trim() || null);
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
