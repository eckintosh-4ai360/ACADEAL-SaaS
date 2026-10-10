 "use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { RoutePreloader, useRoleBasedPreloader } from "@/components/RoutePreloader";
import OfflineStatusBar from "@/components/OfflineStatusBar";
import PopoutShell from "@/components/popout/PopoutShell";
import { useIsPopout } from "@/hooks/usePopout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  //* Detached window: render the screen on its own, without sidebar/navbar
  const isPopout = useIsPopout();

  //* Get role-based routes for preloading
  const userRole = session?.user?.role || "student";
  const preloadRoutes = useRoleBasedPreloader(userRole);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      {/* * Offline status bar — fixed position, outside layout flow */}
      <OfflineStatusBar />
      {/* * Background route preloader — pointless in a single-screen pop-out */}
      {!isPopout && <RoutePreloader routes={preloadRoutes} />}

      <div className="flex h-screen bg-background text-foreground">
        {/* * `popout-hide` hides these pre-paint; the isPopout guard then unmounts
            them so their polling/effects never run in a detached window. */}
        {!isPopout && (
          <div className="no-print popout-hide h-full">
            <Sidebar />
          </div>
        )}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isPopout ? (
            <PopoutShell />
          ) : (
            <div className="no-print popout-hide">
              <Navbar />
            </div>
          )}
          <main className="popout-main flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

