import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Outfit } from "next/font/google";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { DownloadDrawer } from "@/components/download/DownloadDrawer";
import { DownloadFloatingIndicator } from "@/components/download/DownloadFloatingIndicator";
import { SelectionToolbar } from "@/components/file-manager/SelectionToolbar";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#090a0b" },
  ],
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
      <body className="min-h-screen bg-linear-to-b from-stone-50 to-stone-100 text-stone-900 antialiased transition-colors dark:from-stone-950 dark:to-stone-900 dark:text-stone-100">
        <ThemeProvider>
          <SettingsProvider>
            {children}
            <SelectionToolbar />
            <AssignTagsDrawer />
            <DownloadDrawer />
            <DownloadFloatingIndicator />
            <Toaster position="bottom-right" />
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
