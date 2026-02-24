"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { IconX } from "@tabler/icons-react";

import {
  INTELLIGENCE_LEARN_MORE_PATH,
  INTELLIGENCE_SETTINGS_IDS,
} from "@/features/intelligence/intelligence.constants";
import { useIntelligenceStore } from "@/features/intelligence/intelligence.store";
import { useSetting } from "@/ui/hooks/useSettings";

export function ExperimentalNotice() {
  const showExperimentalNoticeSession = useIntelligenceStore((state) => state.showExperimentalNoticeSession);
  const dismissExperimentalNoticeSession = useIntelligenceStore((state) => state.dismissExperimentalNoticeSession);
  const [semanticSearchEnabled] = useSetting(INTELLIGENCE_SETTINGS_IDS.smartSearchEnabled);
  const [noticeDismissed, setNoticeDismissed] = useSetting(INTELLIGENCE_SETTINGS_IDS.noticeDismissed);

  if (semanticSearchEnabled !== true || noticeDismissed === true || !showExperimentalNoticeSession) {
    return null;
  }

  return (
    <div className="px-3 pt-2">
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[11px] text-foreground/90">
        <FlaskConical className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="font-medium">Smart Search is experimental</span>
        <span aria-hidden="true" className="text-muted-foreground">·</span>
        <Link
          href={INTELLIGENCE_LEARN_MORE_PATH}
          className="text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
        >
          Learn more
        </Link>
        <span aria-hidden="true" className="text-muted-foreground">·</span>
        <button
          type="button"
          onClick={() => {
            setNoticeDismissed(true);
            dismissExperimentalNoticeSession();
          }}
          className="ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground dark:hover:bg-white/10"
          aria-label="Dismiss smart search notice"
        >
          <IconX className="size-3" />
        </button>
      </div>
    </div>
  );
}
