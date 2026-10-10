"use client";

import { useCallback, useSyncExternalStore } from "react";

//* Vendor-prefixed Fullscreen API surfaces (Safari / older Edge) are not in the
//* standard DOM typings, so they are declared locally rather than cast inline.
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  msFullscreenElement?: Element | null;
  msExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

const CHANGE_EVENTS = [
  "fullscreenchange",
  "webkitfullscreenchange",
  "MSFullscreenChange",
];

//* The browser owns fullscreen state — the user can leave it with Esc or F11
//* without touching our button, so we subscribe rather than track it ourselves.
function subscribe(onChange: () => void): () => void {
  CHANGE_EVENTS.forEach((event) => document.addEventListener(event, onChange));
  return () => {
    CHANGE_EVENTS.forEach((event) =>
      document.removeEventListener(event, onChange)
    );
  };
}

function getSnapshot(): boolean {
  const doc = document as FullscreenDocument;
  return Boolean(
    doc.fullscreenElement ??
      doc.webkitFullscreenElement ??
      doc.msFullscreenElement
  );
}

const getServerSnapshot = () => false;

export function isFullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as FullscreenElement;
  return Boolean(
    el.requestFullscreen ?? el.webkitRequestFullscreen ?? el.msRequestFullscreen
  );
}

export interface UseFullscreenResult {
  isFullscreen: boolean;
  enter: () => Promise<boolean>;
  exit: () => Promise<boolean>;
  toggle: () => Promise<boolean>;
}

//* Drives true browser/OS fullscreen for the whole app (not a CSS-only
//* imitation), so the system fills the physical screen.
export function useFullscreen(): UseFullscreenResult {
  const isFullscreen = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const enter = useCallback(async () => {
    const el = document.documentElement as FullscreenElement;
    const request =
      el.requestFullscreen ?? el.webkitRequestFullscreen ?? el.msRequestFullscreen;
    if (!request) return false;

    try {
      //* Must be called from a user gesture, or the browser rejects it
      await request.call(el);
      return true;
    } catch {
      return false;
    }
  }, []);

  const exit = useCallback(async () => {
    const doc = document as FullscreenDocument;
    const release =
      doc.exitFullscreen ?? doc.webkitExitFullscreen ?? doc.msExitFullscreen;
    if (!release) return false;

    try {
      await release.call(doc);
      return true;
    } catch {
      return false;
    }
  }, []);

  const toggle = useCallback(
    () => (getSnapshot() ? exit() : enter()),
    [enter, exit]
  );

  return { isFullscreen, enter, exit, toggle };
}
