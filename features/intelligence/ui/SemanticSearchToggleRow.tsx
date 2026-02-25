"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import {
  INTELLIGENCE_LEARN_MORE_PATH,
  INTELLIGENCE_SETTINGS_IDS,
} from "@/features/intelligence/intelligence.constants";
import { useIntelligenceStore } from "@/features/intelligence/intelligence.store";
import { useSetting } from "@/ui/hooks/useSettings";

export function SemanticSearchToggleRow() {
  const modelDownloaded = useIntelligenceStore((state) => state.modelDownloaded);
  const [enabled, setEnabled] = useSetting(INTELLIGENCE_SETTINGS_IDS.smartSearchEnabled);
  const [showInCommandCenter] = useSetting(INTELLIGENCE_SETTINGS_IDS.showInCommandCenter);

  if (!modelDownloaded || showInCommandCenter === false) {
    return null;
  }

  return (
    <div className="px-3 pt-2">
      <div className="border-t border-border/40 pt-2">
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FlaskConical className="size-3.5 text-amber-500" />
                <p className="text-xs font-semibold text-foreground">Smart Search</p>
                <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  Experimental
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                May make mistakes. Verify important results.
                {" "}
                <Link href={INTELLIGENCE_LEARN_MORE_PATH} className="text-primary underline decoration-primary/35 underline-offset-2 hover:decoration-primary">
                  Learn more
                </Link>
              </p>
            </div>
            <Switch
              id="command-semantic-search-toggle"
              checked={enabled === true}
              onCheckedChange={(nextValue) => {
                setEnabled(nextValue);
              }}
              aria-label="Toggle Smart Search"
              size="sm"
              className="mt-0.5"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
