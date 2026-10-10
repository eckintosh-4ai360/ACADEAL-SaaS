import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const toneStyles = {
  sky: {
    bar: "from-sky-500 via-cyan-400 to-blue-600",
    glow: "bg-sky-500/25",
    badge: "bg-sky-500/12 text-sky-700 border-sky-500/20 dark:text-sky-300",
    iconBox: "border-sky-500/15 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    detail: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
    ring: "ring-sky-500/30",
  },
  emerald: {
    bar: "from-emerald-500 via-teal-400 to-green-600",
    glow: "bg-emerald-500/25",
    badge: "bg-emerald-500/12 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
    iconBox: "border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    detail: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/30",
  },
  violet: {
    bar: "from-violet-500 via-fuchsia-400 to-purple-600",
    glow: "bg-violet-500/25",
    badge: "bg-violet-500/12 text-violet-700 border-violet-500/20 dark:text-violet-300",
    iconBox: "border-violet-500/15 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    detail: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
    ring: "ring-violet-500/30",
  },
  amber: {
    bar: "from-amber-500 via-orange-400 to-rose-500",
    glow: "bg-amber-500/25",
    badge: "bg-amber-500/12 text-amber-700 border-amber-500/20 dark:text-amber-300",
    iconBox: "border-amber-500/15 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    detail: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/30",
  },
  rose: {
    bar: "from-rose-500 via-pink-400 to-red-600",
    glow: "bg-rose-500/25",
    badge: "bg-rose-500/12 text-rose-700 border-rose-500/20 dark:text-rose-300",
    iconBox: "border-rose-500/15 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    detail: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/30",
  },
  slate: {
    bar: "from-slate-500 via-slate-400 to-zinc-600",
    glow: "bg-slate-500/25",
    badge: "bg-slate-500/12 text-slate-700 border-slate-500/20 dark:text-slate-300",
    iconBox: "border-slate-500/15 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    detail: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
    ring: "ring-slate-500/30",
  },
  indigo: {
    bar: "from-indigo-500 via-blue-400 to-cyan-500",
    glow: "bg-indigo-500/25",
    badge: "bg-indigo-500/12 text-indigo-700 border-indigo-500/20 dark:text-indigo-300",
    iconBox: "border-indigo-500/15 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    detail: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
    ring: "ring-indigo-500/30",
  },
} as const;

type DashboardMetricTone = keyof typeof toneStyles;

type DashboardMetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone?: DashboardMetricTone;
  badge?: string;
  detail?: string;
  active?: boolean;
  interactive?: boolean;
  className?: string;
  valueClassName?: string;
};

export function DashboardMetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "sky",
  badge,
  detail,
  active = false,
  interactive = false,
  className,
  valueClassName,
}: DashboardMetricCardProps) {
  const styles = toneStyles[tone];

  return (
    <Card
      className={cn(
        "group relative h-full overflow-hidden rounded-[12px] border border-border/70 bg-card/95 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.75)]",
        interactive && "transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_-42px_rgba(15,23,42,0.78)]",
        active && cn("ring-2", styles.ring),
        className
      )}
    >
      <div className={cn("absolute -right-10 -top-12 h-32 w-32 rounded-full blur-3xl", styles.glow)} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_38%)]" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,163,184,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.24) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <CardContent className="relative flex h-full min-h-[220px] flex-col p-5 sm:p-6">
        <div className="flex min-h-[132px] items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {badge ? (
              <span
                className={cn(
                  "inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                  styles.badge
                )}
              >
                {badge}
              </span>
            ) : null}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
                {title}
              </p>
              <p
                className={cn(
                  "mt-2 line-clamp-2 text-2xl font-black leading-tight tracking-tight text-foreground sm:text-3xl",
                  valueClassName
                )}
              >
                {value}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm backdrop-blur-sm",
              styles.iconBox
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-auto flex min-h-[52px] items-end justify-between gap-4">
          <p className="line-clamp-2 max-w-[14rem] text-xs leading-5 text-muted-foreground">
            {description}
          </p>

          {detail ? (
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                styles.detail
              )}
            >
              {detail}
            </span>
          ) : interactive ? (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition-colors group-hover:text-foreground">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
