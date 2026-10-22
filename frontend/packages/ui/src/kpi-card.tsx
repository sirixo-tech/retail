import type { LucideIcon } from "lucide-react";

export function KpiCard({
  icon: Icon,
  value,
  label,
  href,
  action,
  badgeBg,
  iconColor,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  href?: string;
  action?: string;
  badgeBg?: string;
  iconColor?: string;
}) {
  const content = (
    <article
      title={action || label}
      className="group flex items-center gap-4 rounded-[14px] border border-line bg-surface p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-[12px] transition-transform duration-150 group-hover:scale-105"
        style={{
          backgroundColor: badgeBg || "rgba(108, 71, 255, 0.1)",
          color: iconColor || "#6c47ff",
        }}
      >
        <Icon size={22} strokeWidth={1.85} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium capitalize leading-tight text-muted">
          {label}
        </p>
        <p className="num mt-1 text-[21px] sm:text-[23px] font-semibold tracking-tight text-ink leading-tight truncate">
          {value}
        </p>
      </div>
    </article>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return content;
}

