"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePopout } from "@/hooks/usePopout";

interface PopOutButtonProps {
  //* Route to detach. Defaults to the screen the button is rendered on.
  href?: string;
  //* Window/menu label. Defaults to a title derived from the route.
  title?: string;
  //* Visible text for the `button` variant
  label?: string;
  variant?: "icon" | "button" | "ghost";
  width?: number;
  height?: number;
  className?: string;
  //* Render even inside an already-detached window (off by default — popping a
  //* pop-out out again is almost never what the user means)
  showInPopout?: boolean;
}

export default function PopOutButton({
  href,
  title,
  label = "Pop out",
  variant = "icon",
  width,
  height,
  className,
  showInPopout = false,
}: PopOutButtonProps) {
  const { isPopout, openPopout } = usePopout({ href, title, width, height });

  if (isPopout && !showInPopout) return null;

  const tooltip = title
    ? `Open "${title}" in a separate window`
    : "Open this screen in a separate window";

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={() => openPopout()}
        title={tooltip}
        aria-label={tooltip}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium",
          "border border-input bg-background text-foreground",
          "hover:bg-accent hover:text-accent-foreground transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
          className
        )}
      >
        <ExternalLink className="w-4 h-4" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openPopout()}
      title={tooltip}
      aria-label={tooltip}
      className={cn(
        "p-2 rounded-lg transition-colors text-foreground",
        variant === "icon"
          ? "bg-background hover:bg-secondary/80 border border-border"
          : "hover:bg-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <ExternalLink className="w-5 h-5" />
      <span className="sr-only">{tooltip}</span>
    </button>
  );
}
