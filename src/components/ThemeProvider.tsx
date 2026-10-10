"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ 
  children,
  settings 
}: { 
  children: React.ReactNode;
  settings: any;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const css = React.useMemo(() => `
    :root {
      --primary: ${settings.primaryColor};
      --secondary: ${settings.secondaryColor};
      --accent: ${settings.accentColor};
    }

    /* * Override Tailwind colors with custom theme */
    .bg-primary,
    .bg-blue-600 {
      background-color: ${settings.primaryColor} !important;
      color: white !important;
    }

    .text-primary,
    .text-blue-600 {
      color: ${settings.primaryColor} !important;
    }

    .bg-secondary,
    .bg-purple-600 {
      background-color: ${settings.secondaryColor} !important;
      color: white !important;
    }

    .text-secondary,
    .text-purple-600 {
      color: ${settings.secondaryColor} !important;
    }

    .bg-accent,
    .bg-pink-600 {
      background-color: ${settings.accentColor} !important;
      color: white !important;
    }

    .text-accent,
    .text-pink-600 {
      color: ${settings.accentColor} !important;
    }

    /* * Gradient backgrounds */
    .bg-gradient-to-r.from-blue-600.to-purple-600,
    .bg-gradient-to-r.from-blue-600.via-purple-600.to-pink-600 {
      background: linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor}, ${settings.accentColor}) !important;
    }

    /* * Button hover states */
    .bg-primary:hover,
    .bg-blue-600:hover {
      filter: brightness(0.9);
    }

    /* * Border colors */
    .border-l-blue-500 {
      border-left-color: ${settings.primaryColor} !important;
    }

    .border-l-purple-500 {
      border-left-color: ${settings.secondaryColor} !important;
    }

    .border-blue-600 {
      border-color: ${settings.primaryColor} !important;
    }

    /* * Text gradient */
    .bg-gradient-to-r.from-blue-600.to-purple-600.bg-clip-text.text-transparent {
      background: linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* * Background gradients for cards */
    .bg-gradient-to-br.from-blue-500.to-blue-600 {
      background: linear-gradient(to bottom right, ${settings.primaryColor}, ${settings.primaryColor}) !important;
    }

    .bg-gradient-to-br.from-purple-500.to-purple-600 {
      background: linear-gradient(to bottom right, ${settings.secondaryColor}, ${settings.secondaryColor}) !important;
    }

    /* * Active sidebar item */
    .bg-primary.text-white {
      background-color: ${settings.primaryColor} !important;
    }

    /* * Hover states for custom colors */
    .hover\\:text-blue-600:hover,
    .hover\\:text-blue-800:hover {
      color: ${settings.primaryColor} !important;
    }
  `, [settings]);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <style 
        id="theme-styles" 
        dangerouslySetInnerHTML={{ __html: css }} 
      />
      {children}
    </NextThemesProvider>
  );
}

