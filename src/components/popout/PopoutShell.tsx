"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PictureInPicture2, RefreshCw, X, CornerUpLeft } from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";
import FullscreenButton from "@/components/popout/FullscreenButton";
import { routeTitle, stripPopoutParam } from "@/lib/popout";

//* Slim header shown in place of the sidebar + navbar inside a detached window.
//* Keeps the window identifiable and gives the user a way back to the main window.
export default function PopoutShell() {
  const pathname = usePathname();
  const router = useRouter();
  const title = routeTitle(pathname);
  const lastRefresh = useRef(0);

  //* Name the window so it is identifiable in the OS taskbar / window switcher
  useEffect(() => {
    document.title = title;
  }, [title]);

  const refresh = useCallback(() => {
    lastRefresh.current = Date.now();
    router.refresh();
  }, [router]);

  //* Data may have been changed in another window while this one sat in the
  //* background — re-fetch server data when the user comes back to it.
  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastRefresh.current < 5000) return;
      lastRefresh.current = Date.now();
      router.refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  //* Hand this screen back to the main window and close the pop-out
  const returnToMain = () => {
    const target = stripPopoutParam(pathname + window.location.search);
    const opener = window.opener as Window | null;

    if (opener && !opener.closed) {
      try {
        opener.location.href = target;
        opener.focus();
        window.close();
        return;
      } catch {
        //* Cross-origin or detached opener — fall through
      }
    }

    //* No usable opener: drop the pop-out marker and become a normal window
    window.name = "";
    window.location.href = target;
  };

  return (
    <header className="h-12 shrink-0 border-b border-border bg-background flex items-center justify-between px-3 gap-3 no-print">
      <div className="flex items-center gap-2 min-w-0">
        <PictureInPicture2 className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold text-foreground truncate">
          {title}
        </span>
        <span className="hidden sm:inline text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5 shrink-0">
          Detached
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={refresh}
          title="Refresh this screen"
          aria-label="Refresh this screen"
          className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={returnToMain}
          title="Return this screen to the main window"
          aria-label="Return this screen to the main window"
          className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
        >
          <CornerUpLeft className="w-4 h-4" />
        </button>

        {/* * Detached windows are often parked on a second monitor — let one
            fill that screen entirely */}
        <FullscreenButton variant="ghost" iconSize="sm" />

        <ModeToggle />

        <button
          type="button"
          onClick={() => window.close()}
          title="Close this window"
          aria-label="Close this window"
          className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
