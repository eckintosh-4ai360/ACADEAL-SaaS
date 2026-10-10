"use client";

import { Maximize, Minimize } from "lucide-react";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { isFullscreenSupported, useFullscreen } from "@/hooks/useFullscreen";

interface FullscreenButtonProps {
  variant?: "icon" | "button" | "ghost";
  //* Visible text for the `button` variant
  label?: string;
  className?: string;
  //* Icon edge length in px — the pop-out shell uses a tighter bar
  iconSize?: "sm" | "md";
}

export default function FullscreenButton({
  variant = "icon",
  label,
  className,
  iconSize = "md",
}: FullscreenButtonProps) {
  const { isFullscreen, toggle } = useFullscreen();

  const tooltip = isFullscreen
    ? "Exit full screen (Esc)"
    : "View the system in full screen";
  const text = label ?? (isFullscreen ? "Exit full screen" : "Full screen");
  const Icon = isFullscreen ? Minimize : Maximize;
  const iconClass = iconSize === "sm" ? "w-4 h-4" : "w-5 h-5";

  const handleClick = async () => {
    const ok = await toggle();
    if (!ok) {
      toast.error(
        isFullscreenSupported()
          ? "Your browser blocked full screen mode."
          : "Full screen is not supported in this browser."
      );
    }
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={tooltip}
        aria-label={tooltip}
        aria-pressed={isFullscreen}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium",
          "border border-input bg-background text-foreground",
          "hover:bg-accent hover:text-accent-foreground transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
          className
        )}
      >
        <Icon className="w-4 h-4" />
        <span>{text}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={tooltip}
      aria-label={tooltip}
      aria-pressed={isFullscreen}
      className={cn(
        "p-2 rounded-lg transition-colors text-foreground",
        variant === "icon"
          ? "bg-background hover:bg-secondary/80 border border-border"
          : "hover:bg-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <Icon className={iconClass} />
      <span className="sr-only">{tooltip}</span>
    </button>
  );
}
