export function getDeadlineInfo(deadline: string | null | undefined): {
  label: string;
  daysLeft: number;
  variant: "danger" | "warning" | "neutral";
} | null {
  if (!deadline) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadline);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);

  const daysLeft = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysLeft < 0) {
    return {
      label: `${Math.abs(daysLeft)}日超過`,
      daysLeft,
      variant: "danger",
    };
  }
  if (daysLeft === 0) {
    return { label: "本日", daysLeft, variant: "danger" };
  }
  if (daysLeft <= 7) {
    return { label: `あと${daysLeft}日`, daysLeft, variant: "warning" };
  }
  return { label: `あと${daysLeft}日`, daysLeft, variant: "neutral" };
}
