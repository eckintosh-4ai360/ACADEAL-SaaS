"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Filter } from "lucide-react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterSelectProps {
  options: FilterOption[];
  paramName: string;
  placeholder?: string;
  className?: string;
}

export function FilterSelect({ 
  options, 
  paramName, 
  placeholder = "Filter by...",
  className = "" 
}: FilterSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentValue = searchParams.get(paramName) || "";

  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (value) {
      params.set(paramName, value);
      params.set("page", "1"); //* Reset to first page on filter
    } else {
      params.delete(paramName);
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
        <Filter className="w-4 h-4" />
      </div>
      <select
        value={currentValue}
        onChange={(e) => handleFilterChange(e.target.value)}
        className="pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer min-w-[150px]"
        disabled={isPending}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isPending && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}

