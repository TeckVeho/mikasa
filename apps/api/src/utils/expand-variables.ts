/** Expands {{var}} placeholders; supports built-ins from session context. */
export function expandVariables(
  text: string,
  variables: Record<string, string>,
): string {
  const merged = { ...variables };
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (merged[key] !== undefined) return merged[key] ?? "";
    const now = new Date();
    if (key === "current_date") {
      return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    }
    if (key === "current_time") {
      const h = now.getHours();
      const m = now.getMinutes();
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    return "";
  });
}
