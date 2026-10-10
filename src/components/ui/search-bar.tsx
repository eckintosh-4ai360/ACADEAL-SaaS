"use client";

import { Search, X } from "lucide-react";
import { Input } from "./input";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "./button";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export function SearchBar({ placeholder = "Search...", className = "" }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [isPending, startTransition] = useTransition();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const params = new URLSearchParams(searchParams);
    
    if (value) {
      params.set("search", value);
      params.set("page", "1"); //* Reset to first page on search
    } else {
      params.delete("search");
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const clearSearch = () => {
    setSearchTerm("");
    const params = new URLSearchParams(searchParams);
    params.delete("search");
    
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className={`relative flex-1 max-w-md ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      <Input
        type="search"
        placeholder={placeholder}
        className="pl-10 pr-10"
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
      />
      {searchTerm && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
          onClick={clearSearch}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
      {isPending && (
        <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}

