"use client";

import { useState, useEffect } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const PLACEHOLDER = `[
  {
    "name": "check_delivery",
    "description": "伝票番号から配達状況を確認する",
    "parameters": {
      "type": "object",
      "properties": {
        "tracking_number": {
          "type": "string",
          "description": "伝票番号"
        }
      },
      "required": ["tracking_number"]
    }
  }
]`;

export function ToolDefinitionEditor({ value, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value.trim()) {
      setError(null);
      return;
    }
    try {
      JSON.parse(value);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "JSON の構文エラーです");
    }
  }, [value]);

  return (
    <div>
      <label className="text-sm font-medium text-text mb-1.5 block">
        ツール定義
      </label>
      <p className="text-xs text-muted mb-2">
        AIが呼び出せるツール（関数）をJSON形式で定義してください。
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={20}
        className={`w-full resize-y rounded-lg border bg-surface px-3 py-2 font-mono text-sm text-text placeholder:text-muted/60 outline-none transition-all focus:ring-2 ${
          error
            ? "border-danger focus:border-danger/50 focus:ring-danger/10"
            : "border-border focus:border-primary/50 focus:ring-primary/10"
        }`}
        placeholder={PLACEHOLDER}
      />
      {error && (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
