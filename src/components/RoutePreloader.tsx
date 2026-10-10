"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface RoutePreloaderProps {
  /**
   * Routes to preload in priority order
   * Higher priority routes are preloaded first
   */
  routes: Array<{
    path: string;
    priority: number;
  }>;
}

export function RoutePreloader({ routes }: RoutePreloaderProps) {
  const router = useRouter();

  useEffect(() => {
    //* Sort routes by priority (higher first)
    const sortedRoutes = [...routes].sort((a, b) => b.priority - a.priority);

    //* Use requestIdleCallback for non-blocking preloading
    const preloadRoutes = () => {
      sortedRoutes.forEach((route, index) => {
        //* Stagger preloading to avoid overwhelming the browser
        const timeout = index * 100;

        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
          window.requestIdleCallback(
            () => {
              setTimeout(() => {
                router.prefetch(route.path);
              }, timeout);
            },
            { timeout: 2000 }
          );
        } else {
          //* Fallback for browsers without requestIdleCallback
          setTimeout(() => {
            router.prefetch(route.path);
          }, timeout);
        }
      });
    };

    //* Start preloading after a short delay to let critical resources load first
    const initialDelay = setTimeout(preloadRoutes, 1500);

    return () => {
      clearTimeout(initialDelay);
    };
  }, [routes, router]);

  //* This component doesn't render anything
  return null;
}

//* Helper hook for role-based route preloading
export function useRoleBasedPreloader(role: string) {
  const commonRoutes = [
    { path: "/dashboard", priority: 10 },
    { path: "/dashboard/announcements", priority: 5 },
    { path: "/dashboard/events", priority: 5 },
    { path: "/dashboard/academics/notes", priority: 4 },
  ];

  const adminRoutes = [
    { path: "/dashboard/students", priority: 9 },
    { path: "/dashboard/teachers", priority: 9 },
    { path: "/dashboard/analytics", priority: 9 },
    { path: "/dashboard/parents", priority: 8 },
    { path: "/dashboard/classes", priority: 8 },
    { path: "/dashboard/collections", priority: 8 },
    { path: "/dashboard/fees", priority: 7 },
    { path: "/dashboard/attendance", priority: 7 },
  ];

  const teacherRoutes = [
    { path: "/dashboard/students", priority: 9 },
    { path: "/dashboard/classes", priority: 9 },
    { path: "/dashboard/collections", priority: 8 },
    { path: "/dashboard/attendance", priority: 8 },
    { path: "/dashboard/assignments", priority: 7 },
    { path: "/dashboard/acadeal-ai", priority: 8 },
  ];

  const studentRoutes = [
    { path: "/dashboard/academics", priority: 10 },
    { path: "/dashboard/results", priority: 9 },
    { path: "/dashboard/fees", priority: 8 },
    { path: "/dashboard/assignments", priority: 7 },
    { path: "/dashboard/acadeal-ai", priority: 9 },
  ];

  const parentRoutes = [
    { path: "/dashboard/fees", priority: 9 },
    { path: "/dashboard/messages", priority: 8 },
  ];

  let roleRoutes: typeof commonRoutes = [];

  switch (role?.toLowerCase()) {
    case "admin":
      roleRoutes = adminRoutes;
      break;
    case "teacher":
      roleRoutes = teacherRoutes;
      break;
    case "student":
      roleRoutes = studentRoutes;
      break;
    case "parent":
      roleRoutes = parentRoutes;
      break;
  }

  return [...commonRoutes, ...roleRoutes];
}
