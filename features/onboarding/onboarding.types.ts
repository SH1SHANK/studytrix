import type { ComponentType } from "react";

export type OnboardingStep =
  | "capabilities"
  | "identity"
  | "personalized-bridge"
  | "academic-setup"
  | "theme-selection"
  | "completion";

export interface OnboardingCapabilityCard {
  id: string;
  title: string;
  description: string;
  controlHint: string;
  icon: ComponentType<{ className?: string }>;
  accentClassName: string;
}

export interface OnboardingIdentityDraft {
  name: string;
  email: string;
}

export interface OnboardingAcademicDraft {
  department: string;
  semester: number;
  personalRepositoryEnabled: boolean;
}
