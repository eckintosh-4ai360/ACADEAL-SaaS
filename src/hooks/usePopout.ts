"use client";

import { useCallback, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { toast } from "react-toastify";
import {
  isPopoutWindow,
  listOpenPopouts,
  openPopout,
  routeTitle,
  subscribePopouts,
  type OpenPopoutOptions,
  type PopoutEntry,
} from "@/lib/popout";

//* `window.name` / the URL marker never change while a window is alive, so there
//* is nothing to subscribe to.
const subscribeNever = () => () => {};

//* Whether *this* window is a detached screen.
//* The server snapshot is `false` so hydration matches; React then re-renders
//* with the real client value. The pre-paint script in the root layout has
//* already hidden the chrome via CSS by then, so nothing flashes.
export function useIsPopout(): boolean {
  return useSyncExternalStore(subscribeNever, isPopoutWindow, () => false);
}

const EMPTY: PopoutEntry[] = [];

//* Live list of windows this window has popped out
export function useOpenPopouts(): PopoutEntry[] {
  return useSyncExternalStore(
    subscribePopouts,
    listOpenPopouts,
    () => EMPTY
  );
}

export interface UsePopoutResult {
  isPopout: boolean;
  openPopout: (options?: Partial<OpenPopoutOptions>) => void;
  openWindows: PopoutEntry[];
}

//* Main entry point for UI. With no arguments `open()` detaches the current route.
export function usePopout(defaults?: Partial<OpenPopoutOptions>): UsePopoutResult {
  const pathname = usePathname();
  const isPopout = useIsPopout();
  const openWindows = useOpenPopouts();

  const open = useCallback(
    (options?: Partial<OpenPopoutOptions>) => {
      const href =
        options?.href ??
        defaults?.href ??
        //* Preserve the current query string so filters/pagination carry over
        (typeof window !== "undefined"
          ? pathname + window.location.search
          : pathname);

      const title = options?.title ?? defaults?.title ?? routeTitle(href);

      const result = openPopout({
        href,
        title,
        width: options?.width ?? defaults?.width,
        height: options?.height ?? defaults?.height,
      });

      if (!result.ok) {
        toast.error(
          result.reason === "blocked"
            ? "Your browser blocked the pop-out window. Allow pop-ups for this site and try again."
            : "Pop-out windows are not supported in this browser."
        );
        return;
      }

      if (result.reused) {
        toast.info(`"${result.entry.title}" is already open — switched to it.`);
      }
    },
    [defaults?.height, defaults?.href, defaults?.title, defaults?.width, pathname]
  );

  return { isPopout, openPopout: open, openWindows };
}
