import type { Metadata } from "next";
import localFont from "next/font/local";
import { Outfit } from "next/font/google";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { DownloadDrawer } from "@/components/download/DownloadDrawer";
import { DownloadFloatingIndicator } from "@/components/download/DownloadFloatingIndicator";
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

export const metadata: Metadata = {
  title: "Studytrix Dashboard",
  description: "Dashboard UI scaffold",
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
            <DownloadDrawer />
            <DownloadFloatingIndicator />
            <Toaster position="bottom-right" />
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
