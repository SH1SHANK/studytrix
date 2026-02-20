"use client";

import Link from "next/link";
import { IconWifiOff, IconFolderOpen } from "@tabler/icons-react";
import { motion } from "framer-motion";

export default function OfflinePage() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      {/* Subtle Background Effects */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-40 dark:opacity-20">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="h-[40vh] w-[40vh] rounded-full bg-violet-400/20 blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute h-[60vh] w-[60vh] rounded-full bg-sky-400/20 blur-[120px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="z-10 w-full max-w-md relative"
      >
        <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-border/50 to-transparent blur-sm" />
        <div className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-border/50 bg-card/60 p-10 text-center shadow-2xl backdrop-blur-xl">
          
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
            className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-muted/60 shadow-inner ring-1 ring-border/50 dark:bg-muted/30"
          >
            <IconWifiOff className="size-10 text-muted-foreground/80" stroke={1.5} />
          </motion.div>

          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            You are offline
          </h1>
          <p className="mb-8 text[15px] leading-relaxed text-muted-foreground sm:px-4">
            It looks like you've lost your internet connection. Reconnect to access live content, or browse your downloaded files.
          </p>

          <Link
            href="/offline-library"
            className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-foreground px-4 py-3.5 text-[15px] font-semibold text-background transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-[0.98]"
          >
            <IconFolderOpen className="size-5 transition-transform group-hover:-translate-y-0.5" />
            <span>Go to Offline Library</span>
          </Link>
          
          <div className="mt-6 flex items-center justify-center space-x-2 text-[13px] font-medium text-muted-foreground/80">
            <span className="flex size-2 min-w-2 items-center justify-center">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
            </span>
            <span>Waiting for connection...</span>
          </div>

        </div>
      </motion.div>
    </main>
  );
}
