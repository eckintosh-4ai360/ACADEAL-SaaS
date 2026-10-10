"use client";

import { Search, X } from "lucide-react";
import { Input } from "./ui/input";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Button } from "./ui/button";
import { DatePicker } from "./ui/date-picker";

const CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "authentication", label: "Authentication" },
  { value: "user_management", label: "User Management" },
  { value: "academics", label: "Academics" },
  { value: "assessments", label: "Assessments" },
  { value: "communication", label: "Communication" },
  { value: "finance", label: "Finance" },
  { value: "behavior", label: "Behavior" },
  { value: "system", label: "System" },
  { value: "legacy", label: "Legacy" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "SUCCESS", label: "Success" },
  { value: "FAILURE", label: "Failure" },
];

export function AuditLogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const status = searchParams.get("status") || "";
  const fromDate = searchParams.get("from") ? new Date(searchParams.get("from")!) : null;
  const toDate = searchParams.get("to") ? new Date(searchParams.get("to")!) : null;
  const pageSize = searchParams.get("pageSize") || "25";

  const applyFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    params.set("page", "1");

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search request, actor, action, target, summary..."
            value={search}
            onChange={(e) => {
              applyFilters({ search: e.target.value || null });
            }}
            className="pl-10 h-10 border-teal-100 focus:border-teal-500 focus:ring-teal-500"
          />
        </div>

        <select
          value={category}
          onChange={(e) => {
            applyFilters({ category: e.target.value || null });
          }}
          className="h-10 bg-background border border-teal-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => {
            applyFilters({ status: e.target.value || null });
          }}
          className="h-10 bg-background border border-teal-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
            From
          </span>
          <DatePicker
            selected={fromDate}
            onChange={(date) => applyFilters({ from: date ? date.toISOString() : null })}
            placeholder="Start date"
            className="w-[150px] border-teal-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
            To
          </span>
          <DatePicker
            selected={toDate}
            onChange={(date) => applyFilters({ to: date ? date.toISOString() : null })}
            placeholder="End date"
            className="w-[150px] border-teal-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
            Show
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              applyFilters({ pageSize: e.target.value });
            }}
            className="h-10 bg-background border border-teal-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
          >
            <option value="25">25 entries</option>
            <option value="50">50 entries</option>
            <option value="100">100 entries</option>
          </select>
        </div>

        {(search || category || status || fromDate || toDate || pageSize !== "25") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
          >
            <X className="w-4 h-4 mr-2" />
            Reset
          </Button>
        )}
      </div>

      {isPending && (
        <div className="h-0.5 w-full bg-teal-50 overflow-hidden rounded-full">
          <div className="h-full bg-teal-500 animate-[progress_1.5s_infinite_linear] origin-left w-1/3"></div>
        </div>
      )}

      <style jsx>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
