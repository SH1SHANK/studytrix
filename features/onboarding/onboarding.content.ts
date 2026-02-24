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
    title: "Find anything from Command Center",
    description:
      "Search courses, folders, files, and shortcuts from one focused command panel.",
    controlHint: "You can tune result behavior later in Settings > Command Center.",
    icon: IconSearch,
    accentClassName:
      "from-primary/25 via-primary/10 to-transparent text-primary",
  },
  {
    id: "smart-search",
    title: "Use Smart Search when you need intent-based results",
    description:
      "On-device AI can surface related files even when your exact wording is different.",
    controlHint: "You stay in control. Smart Search can be toggled any time.",
    icon: IconBrain,
    accentClassName:
      "from-emerald-400/25 via-emerald-300/10 to-transparent text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "offline",
    title: "Keep files available offline",
    description:
      "Download important files and continue studying without a stable connection.",
    controlHint: "Storage location and limits are adjustable in Offline & Storage settings.",
    icon: IconCloudDownload,
    accentClassName:
      "from-sky-400/25 via-sky-300/10 to-transparent text-sky-600 dark:text-sky-400",
  },
  {
    id: "personal-repository",
    title: "Organize your own space with Personal Repository",
    description:
      "Create custom folders for personal notes, references, and project resources.",
    controlHint: "Show or hide Personal Repository whenever you want.",
    icon: IconFolders,
    accentClassName:
      "from-amber-400/25 via-amber-300/10 to-transparent text-amber-600 dark:text-amber-400",
  },
];
