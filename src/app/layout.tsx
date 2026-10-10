import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SessionProvider from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getSystemSettings } from "@/lib/settings";
import SyncManagerMount from "@/components/SyncManagerMount";
import PWAInstallBanner from "@/components/PWAInstallBanner";
// 
const sora = Sora({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sora",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSystemSettings();
  
  return {
    title: settings.schoolName,
    description: `${settings.schoolName} - Modern Student Management System`,
    manifest: "/manifest.json",
    icons: {
      icon: "/fav.png",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: settings.schoolShortName,
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await getSystemSettings();
  
  return {
    width: "device-width",
     initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    themeColor: settings.primaryColor,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSystemSettings();

  return (
    <html lang="en" className={`${sora.variable} ${sora.className}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@100;200;300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={sora.className} suppressHydrationWarning>
        {/* * Pop-out: flag detached windows before first paint so the sidebar/navbar
            never flashes. Reads the URL marker and window.name (which survives
            in-window navigation). Kept inline and dependency-free on purpose. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var n=window.name||"";var p=new URLSearchParams(window.location.search).get("popout")==="1";if(p||n.indexOf("skpop:")===0){document.documentElement.setAttribute("data-popout","1");}}catch(e){}})();`,
          }}
        />
        <ThemeProvider settings={settings}>
          <SessionProvider>
            {/* PWA: mounts sync manager once on app boot */}
            <SyncManagerMount />
            {/* PWA: install to home screen banner */}
            <PWAInstallBanner shortName={settings.schoolShortName ?? "EckSMS"} />
            {children}
            <div id="datepicker-portal" className="relative z-[9999]" />
            <ToastContainer position="top-right" autoClose={1000} />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

