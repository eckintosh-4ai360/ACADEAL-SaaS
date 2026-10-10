"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { useState } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <Button 
      onClick={handleRefresh}
      disabled={refreshing}
      className="hidden sm:flex bg-white text-blue-600 hover:bg-blue-50 px-4 sm:px-6 py-4 sm:py-6 text-sm sm:text-base md:text-lg"
    >
      <Activity className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
      {refreshing ? "Refreshing..." : "Refresh"}
    </Button>
  );
}
