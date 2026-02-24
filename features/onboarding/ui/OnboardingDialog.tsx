"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { useAcademicContext } from "@/components/layout/AcademicContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCustomFoldersTabsStore } from "@/features/custom-folders/custom-folders.tabs.store";
import { resolveUserProfileSettings } from "@/features/profile/user-profile";
import { useSettingsStore } from "@/features/settings/settings.store";
import type { OnboardingStep } from "@/features/onboarding/onboarding.types";
import { AcademicSetupStep } from "@/features/onboarding/ui/steps/AcademicSetupStep";
import { CapabilitiesStep } from "@/features/onboarding/ui/steps/CapabilitiesStep";
import { CompletionRevealStep } from "@/features/onboarding/ui/steps/CompletionRevealStep";
import { IdentityStep } from "@/features/onboarding/ui/steps/IdentityStep";
import { PersonalizedBridgeStep } from "@/features/onboarding/ui/steps/PersonalizedBridgeStep";
import { ThemeSelectionStep } from "@/features/onboarding/ui/steps/ThemeSelectionStep";
import type { ThemeId } from "@/features/theme/theme.constants";

type OnboardingDialogProps = {
  open: boolean;
  onComplete: () => void;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  "capabilities",
  "identity",
  "personalized-bridge",
  "academic-setup",
  "theme-selection",
  "completion",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEP_META: Record<OnboardingStep, { label: string; index: number }> = {
  capabilities: { label: "Capabilities", index: 1 },
  identity: { label: "Identity", index: 2 },
  "personalized-bridge": { label: "Personalized Setup", index: 3 },
  "academic-setup": { label: "Academic Preferences", index: 4 },
  "theme-selection": { label: "Theme Selection", index: 5 },
  completion: { label: "Finishing", index: 6 },
};
const STEP_BACKGROUND_CLASS: Record<OnboardingStep, string> = {
  capabilities:
    "bg-[radial-gradient(circle_at_12%_18%,hsl(var(--primary)/0.22),transparent_42%),radial-gradient(circle_at_88%_80%,hsl(var(--primary)/0.10),transparent_45%)]",
  identity:
    "bg-[radial-gradient(circle_at_82%_20%,hsl(var(--primary)/0.18),transparent_45%),radial-gradient(circle_at_10%_78%,hsl(var(--foreground)/0.07),transparent_40%)]",
  "personalized-bridge":
    "bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.18),transparent_52%),radial-gradient(circle_at_16%_78%,hsl(var(--foreground)/0.07),transparent_45%)]",
  "academic-setup":
    "bg-[radial-gradient(circle_at_14%_16%,hsl(var(--primary)/0.18),transparent_44%),radial-gradient(circle_at_88%_82%,hsl(var(--foreground)/0.06),transparent_40%)]",
  "theme-selection":
    "bg-[radial-gradient(circle_at_50%_8%,hsl(var(--primary)/0.16),transparent_45%),linear-gradient(180deg,hsl(var(--foreground)/0.06),transparent_42%)]",
  completion:
    "bg-[radial-gradient(circle_at_50%_36%,hsl(var(--primary)/0.26),transparent_58%),radial-gradient(circle_at_78%_82%,hsl(var(--primary)/0.10),transparent_44%)]",
};

export function OnboardingDialog({ open, onComplete }: OnboardingDialogProps) {
  const shouldReduceMotion = useReducedMotion();
  const { department, semester, setDepartment, setSemester } = useAcademicContext();
  const setRepositoryPage = useCustomFoldersTabsStore((state) => state.setActivePage);
  const rawUserProfile = useSettingsStore((state) => state.values.userProfile);
  const personalRepositoryVisible = useSettingsStore(
    (state) => state.values.personal_repository_visible !== false,
  );
  const setSettingValue = useSettingsStore((state) => state.setValue);

  const userProfile = useMemo(
    () => resolveUserProfileSettings(rawUserProfile),
    [rawUserProfile],
  );

  const [step, setStep] = useState<OnboardingStep>("capabilities");
  const [previousStep, setPreviousStep] = useState<OnboardingStep>("capabilities");
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [departmentDraft, setDepartmentDraft] = useState(department);
  const [semesterDraft, setSemesterDraft] = useState(semester);
  const [personalRepositoryEnabled, setPersonalRepositoryEnabled] = useState(
    personalRepositoryVisible,
  );

  const previousOpenRef = useRef(false);
  const completionTriggeredRef = useRef(false);

  useEffect(() => {
    const openingNow = open && !previousOpenRef.current;
    if (openingNow) {
      completionTriggeredRef.current = false;
      setStep("capabilities");
      setPreviousStep("capabilities");
      setDirection(1);
      setName(userProfile.name);
      setEmail(userProfile.email);
      setNameError(null);
      setEmailError(null);
      setDepartmentDraft(department);
      setSemesterDraft(semester);
      setPersonalRepositoryEnabled(personalRepositoryVisible);
    }

    previousOpenRef.current = open;
  }, [department, email, open, personalRepositoryVisible, semester, userProfile.email, userProfile.name]);

  const transition = shouldReduceMotion
    ? { duration: 0.12, ease: "linear" as const }
    : { type: "spring" as const, stiffness: 320, damping: 32, mass: 0.7 };

  const setStepWithDirection = useCallback(
    (nextStep: OnboardingStep) => {
      const currentIndex = ONBOARDING_STEPS.indexOf(step);
      const nextIndex = ONBOARDING_STEPS.indexOf(nextStep);
      setPreviousStep(step);
      setDirection(nextIndex >= currentIndex ? 1 : -1);
      setStep(nextStep);
    },
    [step],
  );

  const handleIdentityContinue = useCallback(() => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    let hasError = false;
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      hasError = true;
      setNameError("Enter a name between 2 and 60 characters.");
    } else {
      setNameError(null);
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      hasError = true;
      setEmailError("Enter a valid email address.");
    } else {
      setEmailError(null);
    }

    if (hasError) {
      return;
    }

    setSettingValue("userProfile", {
      name: trimmedName,
      email: trimmedEmail,
    });

    setStepWithDirection("personalized-bridge");
  }, [email, name, setSettingValue, setStepWithDirection]);

  const handleAcademicContinue = useCallback(() => {
    setDepartment(departmentDraft);
    setSemester(semesterDraft);
    setSettingValue("personal_repository_visible", personalRepositoryEnabled);

    if (!personalRepositoryEnabled) {
      setRepositoryPage("global");
    }

    setStepWithDirection("theme-selection");
  }, [
    departmentDraft,
    personalRepositoryEnabled,
    semesterDraft,
    setDepartment,
    setRepositoryPage,
    setSemester,
    setSettingValue,
    setStepWithDirection,
  ]);

  const handleCompletionDone = useCallback(() => {
    if (completionTriggeredRef.current) {
      return;
    }

    completionTriggeredRef.current = true;
    onComplete();
  }, [onComplete]);

  const firstName = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      return "there";
    }

    const [first] = trimmed.split(/\s+/);
    return first || "there";
  }, [name]);
  const showDialogHeader = step !== "theme-selection";
  const isThemeSelectionStep = step === "theme-selection";
  const cameFromThemeSelection =
    step === "completion" && previousStep === "theme-selection";
  const stepMeta = STEP_META[step];
  const progress = useMemo(
    () => (stepMeta.index / ONBOARDING_STEPS.length) * 100,
    [stepMeta.index],
  );
  const stepTransition = useMemo(() => {
    if (shouldReduceMotion) {
      return { duration: 0.12, ease: "linear" as const };
    }

    if (step === "theme-selection") {
      return { type: "spring" as const, stiffness: 290, damping: 34, mass: 0.8 };
    }

    if (cameFromThemeSelection) {
      return { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.74 };
    }

    return transition;
  }, [cameFromThemeSelection, shouldReduceMotion, step, transition]);

  return (
    <Dialog
      open={open}
      dismissOnOverlayClick={false}
      dismissOnEscape={false}
      onOpenChange={() => undefined}
    >
      <DialogContent
        showCloseButton={false}
        className="h-dvh max-h-none w-screen max-w-none rounded-none border-0 bg-background/95 p-0 backdrop-blur-md sm:h-[min(90dvh,760px)] sm:w-[min(92vw,760px)] sm:max-w-[760px] sm:rounded-3xl sm:border sm:border-border/70 sm:bg-background/92"
      >
        <div className="relative isolate h-full overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              aria-hidden
              className={`pointer-events-none absolute inset-0 ${STEP_BACKGROUND_CLASS[step]}`}
              initial={{ opacity: 0.12, scale: 1.04 }}
              animate={{ opacity: 0.96, scale: 1 }}
              exit={{ opacity: 0.1, scale: 0.98 }}
              transition={{ duration: shouldReduceMotion ? 0.15 : 0.45, ease: "easeOut" }}
            />
          </AnimatePresence>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-10 top-8 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
            animate={shouldReduceMotion ? undefined : { x: [0, -20, 0], y: [0, 18, 0], scale: [1, 1.08, 1] }}
            transition={
              shouldReduceMotion
                ? undefined
                : { repeat: Infinity, duration: 10, ease: "easeInOut" }
            }
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -left-16 bottom-2 h-44 w-44 rounded-full bg-emerald-400/12 blur-3xl"
            animate={shouldReduceMotion ? undefined : { x: [0, 14, 0], y: [0, -16, 0], scale: [1, 1.06, 1] }}
            transition={
              shouldReduceMotion
                ? undefined
                : { repeat: Infinity, duration: 11, ease: "easeInOut" }
            }
          />

          <div className="relative z-10 flex h-full flex-col">
            <AnimatePresence initial={false}>
              {showDialogHeader ? (
                <motion.div
                  key="onboarding-header"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="flex items-center justify-between px-4 pb-2 pt-4 sm:px-6 sm:pt-5">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        Onboarding
                      </p>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={stepMeta.label}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                          className="text-sm font-medium text-foreground"
                        >
                          {stepMeta.label}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stepMeta.index}/{ONBOARDING_STEPS.length}
                    </p>
                  </div>
                  <div className="px-4 pb-2 sm:px-6">
                    <div className="h-1.5 overflow-hidden rounded-full bg-border/60">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={false}
                        animate={{ width: `${progress}%` }}
                        transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.35, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className={isThemeSelectionStep ? "flex-1 overflow-hidden" : undefined}>
              <AnimatePresence custom={direction} mode="wait">
                <motion.section
                  key={step}
                  custom={direction}
                  initial={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : isThemeSelectionStep
                        ? { opacity: 0, y: 140, scale: 0.985 }
                        : cameFromThemeSelection
                          ? { opacity: 0, y: -36, scale: 0.985 }
                          : { opacity: 0, x: direction > 0 ? 72 : -72, y: 12, rotateX: direction > 0 ? 3 : -3, scale: 0.985 }
                  }
                  animate={{ opacity: 1, x: 0, y: 0, rotateX: 0, scale: 1 }}
                  exit={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : isThemeSelectionStep
                        ? { opacity: 0, y: 130, scale: 0.985 }
                        : { opacity: 0, x: direction > 0 ? -56 : 56, y: -10, rotateX: direction > 0 ? -2 : 2, scale: 0.985 }
                  }
                  transition={stepTransition}
                  className={`h-full [transform-style:preserve-3d] ${isThemeSelectionStep ? "overflow-hidden" : ""}`}
                >
                  {step === "capabilities" ? (
                    <CapabilitiesStep
                      onContinue={() => {
                        setStepWithDirection("identity");
                      }}
                    />
                  ) : null}

                  {step === "identity" ? (
                    <IdentityStep
                      name={name}
                      email={email}
                      nameError={nameError}
                      emailError={emailError}
                      onNameChange={(value) => {
                        setName(value);
                        if (nameError) {
                          setNameError(null);
                        }
                      }}
                      onEmailChange={(value) => {
                        setEmail(value);
                        if (emailError) {
                          setEmailError(null);
                        }
                      }}
                      onBack={() => setStepWithDirection("capabilities")}
                      onContinue={handleIdentityContinue}
                    />
                  ) : null}

                  {step === "personalized-bridge" ? (
                    <PersonalizedBridgeStep
                      firstName={firstName}
                      onBack={() => setStepWithDirection("identity")}
                      onContinue={() => setStepWithDirection("academic-setup")}
                    />
                  ) : null}

                  {step === "academic-setup" ? (
                    <AcademicSetupStep
                      department={departmentDraft}
                      semester={semesterDraft}
                      personalRepositoryEnabled={personalRepositoryEnabled}
                      onDepartmentChange={setDepartmentDraft}
                      onSemesterChange={setSemesterDraft}
                      onPersonalRepositoryChange={setPersonalRepositoryEnabled}
                      onBack={() => setStepWithDirection("personalized-bridge")}
                      onContinue={handleAcademicContinue}
                    />
                  ) : null}

                  {step === "theme-selection" ? (
                    <ThemeSelectionStep
                      onBack={() => setStepWithDirection("academic-setup")}
                      onContinue={() => setStepWithDirection("completion")}
                      onThemeSelected={(themeId: ThemeId) => {
                        setSettingValue("theme", themeId);
                      }}
                    />
                  ) : null}

                  {step === "completion" ? (
                    <CompletionRevealStep
                      userName={firstName}
                      onDone={handleCompletionDone}
                    />
                  ) : null}
                </motion.section>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
