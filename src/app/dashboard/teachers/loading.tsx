"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeachersLoading() {
  return (
    <div className="space-y-6">
      {/* ! Header Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32 rounded" />
      </div>

      {/* ! Search Bar Skeleton */}
      <Card className="p-4">
        <Skeleton className="h-10 w-full" />
      </Card>

      {/* ! Table Skeleton */}
      <Card>
        <CardContent className="p-0">
          {/* ! Table Header */}
          <div className="border-b p-4">
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
          </div>
          
          {/* ! Table Rows */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="border-b p-4 animate-pulse">
              <div className="flex gap-4 items-center">
                <Skeleton className="h-10 w-10 rounded-full" />
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-4 flex-1" />
                ))}
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
