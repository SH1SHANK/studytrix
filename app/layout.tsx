import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ThemeStatusBarSync } from "@/features/theme/ui/ThemeStatusBarSync";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { ScrollLockRecovery } from "@/components/layout/ScrollLockRecovery";
import { OfflineRuntime } from "@/features/offline/ui/OfflineRuntime";
import { StorageInit } from "@/features/offline/ui/StorageInit";
import { RootRuntimeMounts } from "@/components/layout/RootRuntimeMounts";
import "./globals.css";

const DEFAULT_SITE_URL = "https://learn.attendrix.app";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().length
  ? process.env.NEXT_PUBLIC_SITE_URL.trim()
  : DEFAULT_SITE_URL;

const outfit = localFont({
  src: [
    { path: "./fonts/Switzer-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Switzer-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Switzer-Semibold.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  variable: "--font-outfit",
  fallback: ["Satoshi", "system-ui", "sans-serif"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Studytrix",
  title: {
    default: "Studytrix | Offline-First Study Workspace",
    template: "%s | Studytrix",
  },
  description:
    "Studytrix is an offline-first academic workspace for browsing course folders, searching with scoped commands, and managing downloads, sharing, tags, and storage across mobile and PWA devices.",
  keywords: [
    "Studytrix",
    "student workspace",
    "offline study app",
    "PWA",
    "course files",
    "command center search",
    "folder scope search",
    "file manager",
    "study materials",
  ],
  authors: [{ name: "Attendrix" }],
  creator: "Attendrix",
  publisher: "Attendrix",
  alternates: {
    canonical: "/",
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Studytrix",
    title: "Studytrix | Offline-First Study Workspace",
    description:
      "Browse course folders, run scoped command search, and manage offline downloads, sharing, and storage in a mobile-first PWA.",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Studytrix app icon",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Studytrix | Offline-First Study Workspace",
    description:
      "Offline-first academic workspace with scoped command search, download/share pipelines, and PWA-ready mobile UX.",
    images: ["/android-chrome-512x512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: "Studytrix",
    statusBarStyle: "black-translucent",
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
    <html lang="en" suppressHydrationWarning className={outfit.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased transition-colors">
        <Script id="studytrix-theme-bootstrap" strategy="beforeInteractive">
          {`(function(){try{var storageKey="studytrix-theme";var palette={classic:"#ffffff",midnight:"#0f172a",forest:"#f0fdf4",sunset:"#fff7ed",minimal:"#f8fafc",eclipse:"#0d0a1a",graphite:"#111111",aurora:"#000000"};var stored=localStorage.getItem(storageKey);var theme=(stored&&palette[stored])?stored:"classic";var color=palette[theme];var root=document.documentElement;root.setAttribute("data-theme",theme);root.style.backgroundColor=color;var applyMeta=function(selector,name,content){var node=document.head.querySelector(selector);if(!node){node=document.createElement("meta");node.setAttribute("name",name);document.head.appendChild(node);}node.setAttribute("content",content);};applyMeta('meta[name="theme-color"]:not([media])',"theme-color",color);var mediaNodes=document.head.querySelectorAll('meta[name="theme-color"][media]');mediaNodes.forEach(function(node){node.setAttribute("content",color);});applyMeta('meta[name="apple-mobile-web-app-status-bar-style"]',"apple-mobile-web-app-status-bar-style","black-translucent");}catch(_){}})();`}
        </Script>
        <Script id="studytrix-startup-guard" strategy="beforeInteractive">
          {`(function(){try{var host=window.location.hostname;var isLocal=host==="localhost"||host==="127.0.0.1";if(isLocal){if("serviceWorker"in navigator){navigator.serviceWorker.getRegistrations().then(function(registrations){registrations.forEach(function(registration){var worker=registration.active||registration.waiting||registration.installing;if(!worker){return;}try{var pathname=new URL(worker.scriptURL).pathname;if(pathname==="/studytrix-sw.js"){registration.unregister();}}catch(_){}});}).catch(function(){});}if("caches"in window){caches.keys().then(function(keys){keys.forEach(function(key){if(key.indexOf("studytrix-shell-")===0||key.indexOf("studytrix-static-")===0){caches.delete(key);}});}).catch(function(){});}}var isOfflineChunkError=function(message){if(navigator.onLine!==false){return false;}var text=String(message||"");return text.indexOf("ChunkLoadError")>=0||text.indexOf("Loading chunk")>=0||text.indexOf("Failed to fetch dynamically imported module")>=0||text.indexOf("Failed to load chunk")>=0;};window.addEventListener("error",function(event){if(isOfflineChunkError(event&&event.message)){window.location.replace("/offline");}},true);window.addEventListener("unhandledrejection",function(event){var reason=event&&event.reason;var message=typeof reason==="string"?reason:(reason&&reason.message)||String(reason||"");if(isOfflineChunkError(message)){window.location.replace("/offline");}});}catch(_){}})();`}
        </Script>
        <ThemeProvider>
          <ThemeStatusBarSync />
          <SettingsProvider>
            <StorageInit />
            <OfflineRuntime />
            <ScrollLockRecovery />
            {children}
            <RootRuntimeMounts />
          </SettingsProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
