import {
  IconBrain,
  IconCloudDownload,
  IconFolders,
  IconSearch,
} from "@tabler/icons-react";

import type { OnboardingCapabilityCard } from "./onboarding.types";

export const ONBOARDING_CAPABILITY_CARDS: OnboardingCapabilityCard[] = [
  {
    id: "command-center",
    title: "Find anything with scope-aware Command Center",
    description:
      "Search global and personal files, folders, and actions from one focused command panel.",
    controlHint: "Use prefixes like /, #, :, >, and @ for faster scoped results.",
    icon: IconSearch,
    accentClassName:
      "from-primary/25 via-primary/10 to-transparent text-primary",
  },
  {
    id: "smart-search",
    title: "Use Smart Search for intent-based discovery",
    description:
      "On-device AI surfaces related notes, code files, and documents even when wording differs.",
    controlHint: "Smart Search is optional and can be toggled anytime from the search area or Settings.",
    icon: IconBrain,
    accentClassName:
      "from-emerald-400/25 via-emerald-300/10 to-transparent text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "offline",
    title: "Stay productive with local-first storage",
    description:
      "Downloads, quick captures, and personal file changes are saved locally first for reliability.",
    controlHint: "Storage location and offline behavior can be adjusted in Offline & Storage settings.",
    icon: IconCloudDownload,
    accentClassName:
      "from-sky-400/25 via-sky-300/10 to-transparent text-sky-600 dark:text-sky-400",
  },
  {
    id: "personal-repository",
    title: "Organize faster with Personal Repository",
    description:
      "Use quick capture, Study Sets, Smart Collections, and pinned files to manage your study flow.",
    controlHint: "Add folders from links or device, then customize health, shelves, and actions.",
    icon: IconFolders,
    accentClassName:
      "from-amber-400/25 via-amber-300/10 to-transparent text-amber-600 dark:text-amber-400",
  },
];
