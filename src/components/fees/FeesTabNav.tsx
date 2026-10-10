"use client";

import Link from "next/link";
import { type FeeTabKey } from "@/lib/user-permissions";
import {
  AlertTriangle,
  Banknote,
  ClipboardList,
  CreditCard,
  FileOutput,
  FileText,
  UserPlus,
} from "lucide-react";

type FeesTabTheme = {
  active: string;
  inactive: string;
  icon: string;
  ring: string;
};

const TABS: Array<{
  key: FeeTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  theme: FeesTabTheme;
}> = [
  {
    key: "fees",
    label: "Fees",
    icon: Banknote,
    theme: {
      active:
        "border-blue-300 bg-blue-50 text-blue-700 shadow-[0_14px_30px_-22px_rgba(37,99,235,0.45)] dark:border-blue-500/35 dark:bg-blue-500/15 dark:text-blue-100 dark:shadow-[0_18px_34px_-24px_rgba(37,99,235,0.4)]",
      inactive:
        "border-slate-200 bg-white/95 text-slate-700 hover:border-blue-200 hover:bg-blue-50/75 hover:text-blue-700 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-blue-500/25 dark:hover:bg-blue-500/10 dark:hover:text-blue-100",
      icon:
        "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
      ring: "ring-blue-500/25 dark:ring-blue-400/30",
    },
  },
  {
    key: "statement",
    label: "Check Statement",
    icon: FileText,
    theme: {
      active:
        "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-[0_14px_30px_-22px_rgba(5,150,105,0.4)] dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-100 dark:shadow-[0_18px_34px_-24px_rgba(5,150,105,0.35)]",
      inactive:
        "border-slate-200 bg-white/95 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/75 hover:text-emerald-700 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-emerald-500/25 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-100",
      icon:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
      ring: "ring-emerald-500/25 dark:ring-emerald-400/30",
    },
  },
  {
    key: "prepare",
    label: "Prepare Bill",
    icon: ClipboardList,
    theme: {
      active:
        "border-amber-300 bg-amber-50 text-amber-800 shadow-[0_14px_30px_-22px_rgba(217,119,6,0.36)] dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-100 dark:shadow-[0_18px_34px_-24px_rgba(217,119,6,0.34)]",
      inactive:
        "border-slate-200 bg-white/95 text-slate-700 hover:border-amber-200 hover:bg-amber-50/75 hover:text-amber-800 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-amber-500/25 dark:hover:bg-amber-500/10 dark:hover:text-amber-100",
      icon:
        "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
      ring: "ring-amber-500/25 dark:ring-amber-400/30",
    },
  },
  {
    key: "admission",
    label: "Admission",
    icon: UserPlus,
    theme: {
      active:
        "border-violet-300 bg-violet-50 text-violet-700 shadow-[0_14px_30px_-22px_rgba(124,58,237,0.4)] dark:border-violet-500/35 dark:bg-violet-500/15 dark:text-violet-100 dark:shadow-[0_18px_34px_-24px_rgba(124,58,237,0.36)]",
      inactive:
        "border-slate-200 bg-white/95 text-slate-700 hover:border-violet-200 hover:bg-violet-50/75 hover:text-violet-700 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-violet-500/25 dark:hover:bg-violet-500/10 dark:hover:text-violet-100",
      icon:
        "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
      ring: "ring-violet-500/25 dark:ring-violet-400/30",
    },
  },
  {
    key: "payments",
    label: "Payment List",
    icon: CreditCard,
    theme: {
      active:
        "border-orange-300 bg-orange-50 text-orange-700 shadow-[0_14px_30px_-22px_rgba(234,88,12,0.38)] dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-100 dark:shadow-[0_18px_34px_-24px_rgba(234,88,12,0.34)]",
      inactive:
        "border-slate-200 bg-white/95 text-slate-700 hover:border-orange-200 hover:bg-orange-50/75 hover:text-orange-700 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-orange-500/25 dark:hover:bg-orange-500/10 dark:hover:text-orange-100",
      icon:
        "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
      ring: "ring-orange-500/25 dark:ring-orange-400/30",
    },
  },
  {
    key: "generate",
    label: "Generate Bill",
    icon: FileOutput,
    theme: {
      active:
        "border-rose-300 bg-rose-50 text-rose-700 shadow-[0_14px_30px_-22px_rgba(225,29,72,0.38)] dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-100 dark:shadow-[0_18px_34px_-24px_rgba(225,29,72,0.34)]",
      inactive:
        "border-slate-200 bg-white/95 text-slate-700 hover:border-rose-200 hover:bg-rose-50/75 hover:text-rose-700 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-rose-500/25 dark:hover:bg-rose-500/10 dark:hover:text-rose-100",
      icon:
        "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
      ring: "ring-rose-500/25 dark:ring-rose-400/30",
    },
  },
  {
    key: "arrears",
    label: "Fees Arrears",
    icon: AlertTriangle,
    theme: {
      active:
        "border-lime-300 bg-lime-50 text-lime-800 shadow-[0_14px_30px_-22px_rgba(101,163,13,0.34)] dark:border-lime-500/35 dark:bg-lime-500/15 dark:text-lime-100 dark:shadow-[0_18px_34px_-24px_rgba(101,163,13,0.3)]",
      inactive:
        "border-slate-200 bg-white/95 text-slate-700 hover:border-lime-200 hover:bg-lime-50/75 hover:text-lime-800 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-lime-500/25 dark:hover:bg-lime-500/10 dark:hover:text-lime-100",
      icon:
        "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300",
      ring: "ring-lime-500/25 dark:ring-lime-400/30",
    },
  },
];

interface FeesTabNavProps {
  activeTab: FeeTabKey;
  visibleTabs?: FeeTabKey[];
}

export function FeesTabNav({ activeTab, visibleTabs }: FeesTabNavProps) {
  const allowedTabs = visibleTabs?.length ? new Set(visibleTabs) : null;

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {TABS.filter((tab) => !allowedTabs || allowedTabs.has(tab.key)).map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <Link
            key={tab.key}
            href={`/dashboard/fees?tab=${tab.key}`}
            aria-current={isActive ? "page" : undefined}
            className={[
              "group inline-flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
              isActive
                ? `scale-[1.02] ${tab.theme.active} ${tab.theme.ring}`
                : `shadow-[0_10px_30px_-24px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 ${tab.theme.inactive}`,
            ].join(" ")}
          >
            <span
              className={[
                "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                tab.theme.icon,
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
