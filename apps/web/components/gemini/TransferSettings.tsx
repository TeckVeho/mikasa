"use client";

type Props = {
  enabled: boolean;
  number: string;
  claimsNumber: string;
  timeout: number;
  humanFirstEnabled: boolean;
  humanFirstNumber: string;
  humanFirstTimeout: number;
  onEnabledChange: (v: boolean) => void;
  onNumberChange: (v: string) => void;
  onClaimsNumberChange: (v: string) => void;
  onTimeoutChange: (v: number) => void;
  onHumanFirstEnabledChange: (v: boolean) => void;
  onHumanFirstNumberChange: (v: string) => void;
  onHumanFirstTimeoutChange: (v: number) => void;
};

export function TransferSettings({
  enabled,
  number,
  claimsNumber,
  timeout,
  humanFirstEnabled,
  humanFirstNumber,
  humanFirstTimeout,
  onEnabledChange,
  onNumberChange,
  onClaimsNumberChange,
  onTimeoutChange,
  onHumanFirstEnabledChange,
  onHumanFirstNumberChange,
  onHumanFirstTimeoutChange,
}: Props) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          転送設定
        </h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <span className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-primary" />
            <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
          </span>
          <span className="text-sm text-text">転送を有効にする</span>
        </label>

        <div className={enabled ? "" : "opacity-40 pointer-events-none"}>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-text mb-1 block">
                転送先番号（通常）
              </label>
              <input
                type="tel"
                value={number}
                onChange={(e) => onNumberChange(e.target.value)}
                placeholder="03-1234-5678"
                className="w-full max-w-xs rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-text placeholder:text-muted/60 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text mb-1 block">
                転送先番号（クレーム）
              </label>
              <input
                type="tel"
                value={claimsNumber}
                onChange={(e) => onClaimsNumberChange(e.target.value)}
                placeholder="03-9999-8888"
                className="w-full max-w-xs rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-text placeholder:text-muted/60 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
              <p className="mt-1 text-xs text-muted">
                未設定の場合は通常の転送先番号を使用します
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-text mb-1 block">
                タイムアウト（秒）
              </label>
              <input
                type="number"
                min={5}
                max={120}
                value={timeout}
                onChange={(e) => onTimeoutChange(Number(e.target.value))}
                className="w-28 rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-text outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
              <span className="ml-2 text-xs text-muted">秒（5〜120）</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          人間優先モード
        </h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <span className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200">
            <input
              type="checkbox"
              checked={humanFirstEnabled}
              onChange={(e) => onHumanFirstEnabledChange(e.target.checked)}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-primary" />
            <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
          </span>
          <span className="text-sm text-text">人間優先を有効にする</span>
        </label>

        <div className={humanFirstEnabled ? "" : "opacity-40 pointer-events-none"}>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-text mb-1 block">
                先に鳴らす番号
              </label>
              <input
                type="tel"
                value={humanFirstNumber}
                onChange={(e) => onHumanFirstNumberChange(e.target.value)}
                placeholder="090-1234-5678"
                className="w-full max-w-xs rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-text placeholder:text-muted/60 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text mb-1 block">
                応答待ち秒数
              </label>
              <input
                type="number"
                min={5}
                max={120}
                value={humanFirstTimeout}
                onChange={(e) => onHumanFirstTimeoutChange(Number(e.target.value))}
                className="w-28 rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-text outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
              <span className="ml-2 text-xs text-muted">
                秒（18秒 ≒ 3コール）
              </span>
            </div>
            <p className="text-xs text-muted">
              不応答の場合、AIが自動で応答します
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
