"use client";

import { useEffect, useState } from "react";
import { Layers, X } from "lucide-react";
import { useOpenPopouts } from "@/hooks/usePopout";
import { closeAllPopouts, closePopout, focusPopout } from "@/lib/popout";

//* Navbar control listing every screen this window has detached, so the user can
//* jump between open windows without hunting through the OS task switcher.
export default function PopoutWindowManager() {
  const openWindows = useOpenPopouts();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = () => setIsOpen(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  if (openWindows.length === 0) {
    //* Collapse during render rather than in an effect, so a later pop-out does
    //* not reopen the menu on a stale `isOpen`.
    if (isOpen) setIsOpen(false);
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title={`${openWindows.length} detached ${openWindows.length === 1 ? "window" : "windows"}`}
        aria-label={`${openWindows.length} detached ${openWindows.length === 1 ? "window" : "windows"}`}
        className="relative p-2 rounded-lg bg-background hover:bg-secondary/80 transition-colors border border-border text-foreground"
      >
        <Layers className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {openWindows.length > 9 ? "9+" : openWindows.length}
        </span>
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-2 w-64 bg-card rounded-lg shadow-lg border border-border py-2 z-50"
        >
          <div className="px-4 py-2 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Detached screens</p>
            <p className="text-xs text-muted-foreground">
              {openWindows.length} open
            </p>
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {openWindows.map((entry) => (
              <div
                key={entry.key}
                className="flex items-center gap-1 px-2 hover:bg-muted rounded-md mx-1"
              >
                <button
                  type="button"
                  onClick={() => focusPopout(entry.key)}
                  className="flex-1 text-left px-2 py-2 text-sm text-foreground truncate"
                  title={`Switch to ${entry.title}`}
                >
                  {entry.title}
                </button>
                <button
                  type="button"
                  onClick={() => closePopout(entry.key)}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                  title={`Close ${entry.title}`}
                  aria-label={`Close ${entry.title}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-border mt-1 pt-1">
            <button
              type="button"
              onClick={() => {
                closeAllPopouts();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Close all windows
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
