import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Outfit } from "next/font/google";
import Script from "next/script";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { DownloadDrawer } from "@/components/download/DownloadDrawer";
import { DownloadFloatingIndicator } from "@/components/download/DownloadFloatingIndicator";
import { SelectionToolbar } from "@/components/file-manager/SelectionToolbar";
import { OfflineRuntime } from "@/components/offline/OfflineRuntime";
import { StorageInit } from "@/components/offline/StorageInit";
import { AssignTagsDrawer } from "@/components/tags/AssignTagsDrawer";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-outfit",
  fallback: ["Inter", "Satoshi", "system-ui", "sans-serif"],
});

const switzer = localFont({
  src: [
    { path: "./fonts/Switzer-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Switzer-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Switzer-Semibold.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  variable: "--font-switzer",
  fallback: ["Inter", "Satoshi", "system-ui", "sans-serif"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Studytrix Dashboard",
  description: "Dashboard UI scaffold",
  appleWebApp: {
    capable: true,
    title: "Studytrix",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} ${switzer.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased transition-colors">
        <Script id="studytrix-startup-guard" strategy="beforeInteractive">
          {`(function(){try{var host=window.location.hostname;var isLocal=host==="localhost"||host==="127.0.0.1";if(isLocal){if("serviceWorker"in navigator){navigator.serviceWorker.getRegistrations().then(function(registrations){registrations.forEach(function(registration){var worker=registration.active||registration.waiting||registration.installing;if(!worker){return;}try{var pathname=new URL(worker.scriptURL).pathname;if(pathname==="/studytrix-sw.js"){registration.unregister();}}catch(_){}});}).catch(function(){});}if("caches"in window){caches.keys().then(function(keys){keys.forEach(function(key){if(key.indexOf("studytrix-shell-")===0||key.indexOf("studytrix-static-")===0){caches.delete(key);}});}).catch(function(){});}}var isOfflineChunkError=function(message){if(navigator.onLine!==false){return false;}var text=String(message||"");return text.indexOf("ChunkLoadError")>=0||text.indexOf("Loading chunk")>=0||text.indexOf("Failed to fetch dynamically imported module")>=0||text.indexOf("Failed to load chunk")>=0;};window.addEventListener("error",function(event){if(isOfflineChunkError(event&&event.message)){window.location.replace("/offline.html");}},true);window.addEventListener("unhandledrejection",function(event){var reason=event&&event.reason;var message=typeof reason==="string"?reason:(reason&&reason.message)||String(reason||"");if(isOfflineChunkError(message)){window.location.replace("/offline.html");}});}catch(_){}})();`}
        </Script>
        <ThemeProvider>
          <SettingsProvider>
            <StorageInit />
            <OfflineRuntime />
            {children}
            <SelectionToolbar />
            <AssignTagsDrawer />
            <DownloadDrawer />
            <DownloadFloatingIndicator />
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
