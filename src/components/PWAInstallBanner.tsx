"use client";

/**
 * components/PWAInstallBanner.tsx
 *
 * Captures the browser's `beforeinstallprompt` event and shows
 * a custom, branded install banner. When tapped, calls the deferred prompt.
 * Dismissed state is stored in localStorage so it doesn't re-appear.
 */

import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

interface PWAInstallBannerProps {
  shortName?: string;
}

const STORAGE_KEY = "pwa-install-dismissed";

export default function PWAInstallBanner({ shortName = "EckSMS" }: PWAInstallBannerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // If user already dismissed or installed, don't show
    if (localStorage.getItem(STORAGE_KEY)) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      localStorage.setItem(STORAGE_KEY, "installed");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem(STORAGE_KEY, "installed");
      }
    } catch (error) {
      console.error("[PWAInstallBanner] Install prompt error:", error);
    }
    setIsVisible(false);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setIsVisible(false);
    setDeferredPrompt(null);
    localStorage.setItem(STORAGE_KEY, "dismissed");
  }

  if (!isVisible) return null;

  return (
    <div
      role="banner"
      aria-label="Install app to home screen"
      className="
        fixed bottom-4 left-4 right-4 z-[9998]
        flex items-center gap-3
        rounded-2xl border border-white/20
        bg-slate-900/95 backdrop-blur-md
        p-4 shadow-2xl shadow-black/40
        text-white
        sm:left-auto sm:right-4 sm:max-w-sm
        animate-in slide-in-from-bottom-4 duration-300
      "
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500">
        <Smartphone className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">
          Add {shortName} to home screen
        </p>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug">
          Works offline. No App Store needed.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          aria-label="Install app"
          className="
            flex items-center gap-1.5
            rounded-lg bg-blue-500 hover:bg-blue-600
            px-3 py-1.5 text-xs font-semibold
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-blue-400
          "
        >
          <Download className="h-3.5 w-3.5" />
          Install
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install banner"
          className="
            flex h-7 w-7 items-center justify-center
            rounded-md text-slate-400 hover:text-white hover:bg-white/10
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-white/30
          "
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
