"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* ! Welcome Header Skeleton */}
      <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-64 bg-white/20" />
            <Skeleton className="h-4 w-48 bg-white/20" />
            <Skeleton className="h-5 w-80 bg-white/20" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-32 bg-white/20 rounded-full" />
              <Skeleton className="h-8 w-40 bg-white/20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
              
      {/* ! Main Statistics Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card
            key={i}
            className="relative overflow-hidden rounded-[26px] border border-border/70 bg-card/95 animate-pulse"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6 space-y-0">
              <div className="space-y-3">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-12 w-12 rounded-2xl" />
            </CardHeader>
            <CardContent className="pb-6">
              <Skeleton className="mb-4 h-10 w-28" />
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ! Charts Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="bg-muted/10 border-b">
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="pt-6">
              <Skeleton className="h-64 w-full rounded-lg" />
              <div className="grid grid-cols-2 gap-4 mt-6">
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* * Notice Board and Events Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="bg-muted/10 border-b">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-8 w-20 rounded" />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="p-4 rounded-lg bg-muted/20">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ! Quick Actions Skeleton */}
      <Card className="bg-muted/20 border-2 border-dashed animate-pulse">
        <CardContent className="pt-6">
          <Skeleton className="h-6 w-32 mx-auto mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
