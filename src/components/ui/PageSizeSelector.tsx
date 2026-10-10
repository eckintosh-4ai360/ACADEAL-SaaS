"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/select";

export function PageSizeSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const pageSize = searchParams.get("pageSize") || "15";

  const handlePageSizeChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("pageSize", value);
    params.set("page", "1");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
      <span>Show</span>
      <Select
        value={pageSize}
        onChange={(e) => handlePageSizeChange((e.target as HTMLSelectElement).value)}
        className="h-9 w-20 py-1"
        disabled={isPending}
      >
        <option value="15">15</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </Select>
      <span>entries</span>
    </div>
  );
}
