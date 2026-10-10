"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Banknote, CalendarCheck, Star, LayoutDashboard, ReceiptText } from "lucide-react";

const HR_TABS = [
  { title: "Overview", href: "/dashboard/hr", icon: LayoutDashboard, exact: true },
  { title: "Payroll", href: "/dashboard/hr/payroll", icon: Banknote },
  { title: "Payslips", href: "/dashboard/hr/payslips", icon: ReceiptText },
  { title: "Leave", href: "/dashboard/hr/leave", icon: CalendarCheck },
  { title: "Appraisals", href: "/dashboard/hr/appraisals", icon: Star },
];

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
            HR Modules
          </p>
          <h1 className="text-3xl font-black tracking-tight">
            Human Resources Workspace
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-300">
            Manage payroll runs, staff leave approvals, and formal appraisal
            cycles across your entire staff.
          </p>
        </div>

        {/* Tabs */}
        <nav className="mt-6 flex gap-2 flex-wrap">
          {HR_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-white text-slate-900 shadow"
                    : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.title}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
