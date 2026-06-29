import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mx-auto max-w-3xl",
        align === "center" && "text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-3 text-sm font-medium tracking-wide text-primary">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl lg:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
