export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold text-text">
          {title}
        </h1>
        {description && (
          <div className="mt-0.5 text-[13px] text-muted">{description}</div>
        )}
      </div>
      {action}
    </div>
  );
}
