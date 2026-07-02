export type TranscriptRole = "user" | "model";

export function transcriptRolePrefix(role: TranscriptRole): string {
  return role === "user" ? "お客様: " : "AI: ";
}

/**
 * Gemini Live のストリーミング transcription チャンクを
 * 話者単位の行に結合して蓄積する。
 */
export class TranscriptAccumulator {
  private committed = "";
  private pendingRole: TranscriptRole | null = null;
  private pendingText = "";

  appendChunk(role: TranscriptRole, text: string): void {
    if (!text) return;

    if (this.pendingRole !== null && role !== this.pendingRole) {
      this.flushPending();
    }

    this.pendingRole = role;
    this.pendingText += text;
  }

  onTurnComplete(): void {
    this.flushPending();
  }

  /** DB 保存・fallback 判定用の確定済みテキスト */
  getCommitted(): string {
    return this.committed;
  }

  /** リアルタイム監視用（バッファ中の行を含む） */
  getPreview(): string {
    if (!this.pendingText || !this.pendingRole) {
      return this.committed;
    }

    return (
      this.committed +
      transcriptRolePrefix(this.pendingRole) +
      this.pendingText
    );
  }

  /** 通話終了時にバッファをフラッシュして全文を返す */
  finalize(): string {
    this.flushPending();
    return this.committed;
  }

  private flushPending(): void {
    if (!this.pendingText || !this.pendingRole) return;

    this.committed +=
      transcriptRolePrefix(this.pendingRole) + this.pendingText + "\n";
    this.pendingText = "";
    this.pendingRole = null;
  }
}
