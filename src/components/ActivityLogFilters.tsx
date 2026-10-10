"use client";

import { Search, X, Filter } from "lucide-react";
import { Input } from "./ui/input";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { Button } from "./ui/button";
import { DatePicker } from "./ui/date-picker";

export function ActivityLogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [fromDate, setFromDate] = useState<Date | null>(
    searchParams.get("from") ? new Date(searchParams.get("from")!) : null
  );
  const [toDate, setToDate] = useState<Date | null>(
    searchParams.get("to") ? new Date(searchParams.get("to")!) : null
  );
  const [pageSize, setPageSize] = useState(searchParams.get("pageSize") || "10");

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setFromDate(searchParams.get("from") ? new Date(searchParams.get("from")!) : null);
    setToDate(searchParams.get("to") ? new Date(searchParams.get("to")!) : null);
    setPageSize(searchParams.get("pageSize") || "10");
  }, [searchParams]);

  const applyFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    params.set("page", "1"); //* Reset pagination

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    applyFilters({ search: val || null });
  };

  const handleDateChange = (type: "from" | "to", date: Date | null) => {
    if (type === "from") setFromDate(date);
    else setToDate(date);

    //* Save as ISO string for simple parsing on server
    applyFilters({ [type]: date ? date.toISOString() : null });
  };

  const handlePageSizeChange = (val: string) => {
    setPageSize(val);
    applyFilters({ pageSize: val });
  };

  const clearFilters = () => {
    setSearch("");
    setFromDate(null);
    setToDate(null);
    setPageSize("10");
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* ! Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, action, role..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 h-10 border-teal-100 focus:border-teal-500 focus:ring-teal-500"
          />
        </div>

        {/* ! Date Range Selection */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">From</span>
            <DatePicker
              selected={fromDate}
              onChange={(date) => handleDateChange("from", date)}
              placeholder="Start Date"
              className="w-[150px] border-teal-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">To</span>
            <DatePicker
              selected={toDate}
              onChange={(date) => handleDateChange("to", date)}
              placeholder="End Date"
              className="w-[150px] border-teal-100"
            />
          </div>
        </div>

        {/* * Page Size & Reset */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Show</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(e.target.value)}
              className="h-10 bg-background border border-teal-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            >
              <option value="10">10 entries</option>
              <option value="25">25 entries</option>
              <option value="50">50 entries</option>
              <option value="100">100 entries</option>
            </select>
          </div>

          {(search || fromDate || toDate || pageSize !== "10") && (
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
