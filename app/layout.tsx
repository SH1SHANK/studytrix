import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Outfit } from "next/font/google";

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
        <ThemeProvider>
          <SettingsProvider>
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
