"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CapabilitiesSlide } from "@/components/onboarding/slides/CapabilitiesSlide";
import { CompletionSlide } from "@/components/onboarding/slides/CompletionSlide";
import { FeaturesGuideSlide } from "@/components/onboarding/slides/FeaturesGuideSlide";
import { GreetingSlide } from "@/components/onboarding/slides/GreetingSlide";
import { IdentitySlide } from "@/components/onboarding/slides/IdentitySlide";
import { PersonalSlide } from "@/components/onboarding/slides/PersonalSlide";
import { AcademicSlide } from "@/components/onboarding/slides/AcademicSlide";
import { ThemeSlide } from "@/components/onboarding/slides/ThemeSlide";
import { WelcomeConsentSlide } from "@/components/onboarding/slides/WelcomeConsentSlide";
import { useAcademicContext } from "@/components/layout/AcademicContext";
import { ONBOARDING_CAPABILITY_CARDS } from "@/features/onboarding/onboarding.content";
import { useSettingsStore } from "@/features/settings/settings.store";
import { resolveUserProfileSettings } from "@/features/profile/user-profile";
import {
  DEFAULT_THEME_ID,
  THEMES,
  type ThemeId,
} from "@/features/theme/theme.constants";

type OnboardingDialogProps = {
  open: boolean;
  onComplete: () => void;
};

type CatalogIndexEntry = {
  id: string;
  name: string;
  availableSemesters: number[];
};

type SlideDefinition = {
  id:
    | "welcome-consent"
    | `capability-${string}`
    | "features-guide"
    | "identity"
    | "greeting"
    | "personal"
    | "academic"
    | "theme"
    | "completion";
  counted: boolean;
};

const CATALOG_CACHE_KEY = "studytrix_onboarding_catalog_index_v1";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readCachedCatalogIndex(): CatalogIndexEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as { departments?: CatalogIndexEntry[] };
    return Array.isArray(parsed.departments) ? parsed.departments : [];
  } catch {
    return [];
  }
}

function writeCachedCatalogIndex(departments: CatalogIndexEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      CATALOG_CACHE_KEY,
      JSON.stringify({ departments, cachedAt: Date.now() }),
    );
  } catch {
    // ignore storage failures
  }
}

function normalizeThemeId(theme: string | undefined): ThemeId {
  if (THEMES.some((themeOption) => themeOption.id === theme)) {
    return theme as ThemeId;
  }
  return DEFAULT_THEME_ID;
}

export function OnboardingDialog({ open, onComplete }: OnboardingDialogProps) {
  const { theme, setTheme } = useTheme();
  const { department, semester, setDepartment, setSemester } = useAcademicContext();
  const rawUserProfile = useSettingsStore((state) => state.values.userProfile);
  const personalRepositoryVisible = useSettingsStore((state) => state.values.personal_repository_visible !== false);
  const setSettingValue = useSettingsStore((state) => state.setValue);

  const userProfile = useMemo(() => resolveUserProfileSettings(rawUserProfile), [rawUserProfile]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [departmentDraft, setDepartmentDraft] = useState(department);
  const [semesterDraft, setSemesterDraft] = useState(semester);
  const [personalRepositoryEnabled, setPersonalRepositoryEnabled] = useState(personalRepositoryVisible);
  const [themeDraft, setThemeDraft] = useState<ThemeId>(normalizeThemeId(theme));
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const [nameSuccessTick, setNameSuccessTick] = useState(0);
  const [emailSuccessTick, setEmailSuccessTick] = useState(0);
  const [departmentSuccessTick, setDepartmentSuccessTick] = useState(0);
  const [semesterSuccessTick, setSemesterSuccessTick] = useState(0);

  const [departments, setDepartments] = useState<CatalogIndexEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const completionTriggeredRef = useRef(false);

  const slides = useMemo<SlideDefinition[]>(() => [
    { id: "welcome-consent", counted: true },
    ...ONBOARDING_CAPABILITY_CARDS.map((card) => ({ id: `capability-${card.id}` as `capability-${string}`, counted: true })),
    { id: "features-guide", counted: true },
    { id: "identity", counted: true },
    { id: "greeting", counted: false },
    { id: "personal", counted: true },
    { id: "academic", counted: true },
    { id: "theme", counted: true },
    { id: "completion", counted: true },
  ], []);

  const countedIndices = useMemo(
    () => slides
      .map((slide, index) => ({ ...slide, index }))
      .filter((slide) => slide.counted)
      .map((slide) => slide.index),
    [slides],
  );

  const totalSteps = countedIndices.length;

  const currentCountedIndex = useMemo(() => {
    const found = countedIndices.findLastIndex((index) => index <= currentIndex);
    return found >= 0 ? found : 0;
  }, [countedIndices, currentIndex]);

  const currentStep = currentCountedIndex + 1;

  const currentSlide = slides[currentIndex];

  const currentTheme = useMemo(() => normalizeThemeId(theme), [theme]);

  const activeDepartment = useMemo(
    () => departments.find((entry) => entry.id === departmentDraft) ?? null,
    [departmentDraft, departments],
  );

  const activeSemesterOptions = useMemo(
    () => activeDepartment?.availableSemesters ?? [],
    [activeDepartment],
  );

  const loadAcademicMappings = useCallback(async () => {
    const cached = readCachedCatalogIndex();
    if (cached.length > 0) {
      setDepartments(cached);
      setCatalogError(null);
    }

    setCatalogLoading(true);
    try {
      const response = await fetch("/api/catalog/index", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const payload = (await response.json()) as { departments?: CatalogIndexEntry[] };
      const nextDepartments = Array.isArray(payload.departments) ? payload.departments : [];
      if (nextDepartments.length === 0) {
        throw new Error("No academic mappings available.");
      }

      setDepartments(nextDepartments);
      setCatalogError(null);
      writeCachedCatalogIndex(nextDepartments);
    } catch (error) {
      if (cached.length === 0) {
        setCatalogError(error instanceof Error ? error.message : "Failed to load academic mappings.");
      }
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    completionTriggeredRef.current = false;
    setCurrentIndex(0);
    setDirection(1);
    setName(userProfile.name);
    setEmail(userProfile.email);
    setNameError(null);
    setEmailError(null);
    setNameSuccessTick(0);
    setEmailSuccessTick(0);
    setDepartmentSuccessTick(0);
    setSemesterSuccessTick(0);
    setDepartmentDraft(department);
    setSemesterDraft(semester);
    setPersonalRepositoryEnabled(personalRepositoryVisible);
    setThemeDraft(currentTheme);
    setAcceptedLegal(false);
    void loadAcademicMappings();
  }, [currentTheme, department, loadAcademicMappings, open, personalRepositoryVisible, semester, userProfile.email, userProfile.name]);

  useEffect(() => {
    if (departments.length === 0) {
      return;
    }

    const currentDepartment = departments.find((entry) => entry.id === departmentDraft);
    if (!currentDepartment) {
      const nextDepartment = departments[0];
      if (nextDepartment) {
        setDepartmentDraft(nextDepartment.id);
        setSemesterDraft(nextDepartment.availableSemesters[0] ?? 1);
      }
      return;
    }

    if (!currentDepartment.availableSemesters.includes(semesterDraft)) {
      setSemesterDraft(currentDepartment.availableSemesters[0] ?? 1);
    }
  }, [departmentDraft, departments, semesterDraft]);

  const validateIdentity = useCallback(() => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    let valid = true;
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      setNameError("Enter a name between 2 and 60 characters.");
      valid = false;
    } else {
      setNameError(null);
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setEmailError("Enter a valid email address.");
      valid = false;
    } else {
      setEmailError(null);
    }

    if (valid) {
      setNameSuccessTick((tick) => tick + 1);
      setEmailSuccessTick((tick) => tick + 1);
    }

    return valid;
  }, [email, name]);

  const validateAcademic = useCallback(() => {
    if (departments.length === 0) {
      setCatalogError("Academic mappings are required to continue.");
      return false;
    }

    if (!activeDepartment || !activeSemesterOptions.includes(semesterDraft)) {
      setCatalogError("Select a valid department and semester from available mappings.");
      return false;
    }

    setCatalogError(null);
    setDepartmentSuccessTick((tick) => tick + 1);
    setSemesterSuccessTick((tick) => tick + 1);
    return true;
  }, [activeDepartment, activeSemesterOptions, departments.length, semesterDraft]);

  const canAdvanceFromIndex = useCallback((index: number) => {
    const slideId = slides[index]?.id;
    if (!slideId) {
      return false;
    }

    if (slideId === "identity") {
      return validateIdentity();
    }

    if (slideId === "welcome-consent") {
      return acceptedLegal;
    }

    if (slideId === "academic") {
      return validateAcademic();
    }

    return true;
  }, [acceptedLegal, slides, validateAcademic, validateIdentity]);

  const navigateToIndex = useCallback((targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= slides.length || targetIndex === currentIndex) {
      return false;
    }

    if (targetIndex > currentIndex) {
      for (let cursor = currentIndex; cursor < targetIndex; cursor += 1) {
        if (!canAdvanceFromIndex(cursor)) {
          return false;
        }
      }
    }

    setDirection(targetIndex > currentIndex ? 1 : -1);
    setCurrentIndex(targetIndex);
    return true;
  }, [canAdvanceFromIndex, currentIndex, slides.length]);

  const completeOnboarding = useCallback(() => {
    if (completionTriggeredRef.current) {
      return;
    }

    completionTriggeredRef.current = true;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    setSettingValue("userProfile", {
      name: trimmedName,
      email: trimmedEmail,
    });
    setDepartment(departmentDraft);
    setSemester(semesterDraft);
    setSettingValue("personal_repository_visible", personalRepositoryEnabled);
    setSettingValue("theme", themeDraft);
    setTheme(themeDraft);
    onComplete();
  }, [departmentDraft, email, name, onComplete, personalRepositoryEnabled, semesterDraft, setDepartment, setSemester, setSettingValue, setTheme, themeDraft]);

  const handleNext = useCallback(() => {
    if (!currentSlide) {
      return;
    }

    if (currentSlide.id === "completion") {
      completeOnboarding();
      return;
    }

    void navigateToIndex(currentIndex + 1);
  }, [completeOnboarding, currentIndex, currentSlide, navigateToIndex]);

  const handlePrev = useCallback(() => {
    void navigateToIndex(currentIndex - 1);
  }, [currentIndex, navigateToIndex]);

  const handleStepPress = useCallback((stepIndex: number) => {
    if (stepIndex > currentCountedIndex) {
      return;
    }

    const target = countedIndices[stepIndex];
    if (typeof target !== "number") {
      return;
    }

    void navigateToIndex(target);
  }, [countedIndices, currentCountedIndex, navigateToIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePrev();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNext, handlePrev, open]);

  const nextDisabled = useMemo(() => {
    if (!currentSlide) {
      return true;
    }

    if (currentSlide.id === "welcome-consent") {
      return !acceptedLegal;
    }

    if (currentSlide.id === "identity") {
      return name.trim().length === 0 || email.trim().length === 0;
    }

    if (currentSlide.id === "academic") {
      return departments.length === 0;
    }

    return false;
  }, [acceptedLegal, currentSlide, departments.length, email, name]);

  const nextLabel = useMemo(() => {
    if (currentSlide?.id === "completion") {
      return "Get Started";
    }
    if (currentSlide?.id === "welcome-consent") {
      return acceptedLegal ? "Continue" : "Accept to Continue";
    }
    return "Continue";
  }, [acceptedLegal, currentSlide?.id]);

  const renderSlide = useCallback((ready: boolean) => {
    const slideId = currentSlide?.id;

    if (!slideId) {
      return null;
    }

    if (slideId.startsWith("capability-")) {
      const capabilityId = slideId.replace("capability-", "");
      const capabilityCard = ONBOARDING_CAPABILITY_CARDS.find((card) => card.id === capabilityId);

      if (capabilityCard) {
        return (
          <CapabilitiesSlide
            ready={ready}
            eyebrow="Capabilities"
            title={capabilityCard.title}
            subtitle={capabilityCard.description}
            hint={capabilityCard.controlHint}
            icon={<capabilityCard.icon className="size-6" />}
            accentClassName={capabilityCard.accentClassName}
          />
        );
      }

    }

    if (slideId === "welcome-consent") {
      return (
        <WelcomeConsentSlide
          ready={ready}
          accepted={acceptedLegal}
          onAcceptedChange={setAcceptedLegal}
        />
      );
    }

    if (slideId === "features-guide") {
      return <FeaturesGuideSlide ready={ready} />;
    }

    if (slideId === "identity") {
      return (
        <IdentitySlide
          ready={ready}
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
          nameSuccessTick={nameSuccessTick}
          emailSuccessTick={emailSuccessTick}
        />
      );
    }

    if (slideId === "greeting") {
      return (
        <GreetingSlide
          ready={ready}
          name={name}
          onContinue={() => {
            void navigateToIndex(currentIndex + 1);
          }}
        />
      );
    }

    if (slideId === "personal") {
      return (
        <PersonalSlide
          ready={ready}
          personalRepositoryEnabled={personalRepositoryEnabled}
          onPersonalRepositoryChange={setPersonalRepositoryEnabled}
        />
      );
    }

    if (slideId === "academic") {
      return (
        <AcademicSlide
          ready={ready}
          departments={departments}
          department={departmentDraft}
          semester={semesterDraft}
          loading={catalogLoading}
          error={catalogError}
          onDepartmentChange={setDepartmentDraft}
          onSemesterChange={setSemesterDraft}
          onRetry={() => {
            void loadAcademicMappings();
          }}
          departmentSuccessTick={departmentSuccessTick}
          semesterSuccessTick={semesterSuccessTick}
        />
      );
    }

    if (slideId === "theme") {
      return (
        <ThemeSlide
          ready={ready}
          selectedTheme={themeDraft}
          onThemeSelected={setThemeDraft}
        />
      );
    }

    if (slideId === "completion") {
      return <CompletionSlide ready={ready} name={name} />;
    }

    return null;
  }, [acceptedLegal, catalogError, catalogLoading, currentIndex, currentSlide?.id, departmentDraft, departmentSuccessTick, departments, email, emailError, emailSuccessTick, loadAcademicMappings, name, nameError, nameSuccessTick, navigateToIndex, personalRepositoryEnabled, semesterDraft, semesterSuccessTick, themeDraft]);

  return (
    <Dialog
      open={open}
      dismissOnOverlayClick={false}
      dismissOnEscape={false}
      onOpenChange={() => undefined}
    >
      <DialogContent
        showCloseButton={false}
        className="h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] gap-0 overflow-hidden rounded-none border-0 bg-background p-0 sm:h-[100dvh] sm:max-h-[100dvh] sm:w-[100vw] sm:max-w-[100vw] sm:rounded-none sm:border-0"
      >
        <OnboardingShell
          slideKey={currentSlide?.id ?? "unknown"}
          direction={direction}
          renderSlide={renderSlide}
          allowVerticalScroll={currentSlide?.id === "theme"}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onStepPress={handleStepPress}
          onNext={handleNext}
          onPrev={handlePrev}
          nextDisabled={nextDisabled}
          nextLabel={nextLabel}
          showNavigation={true}
          showBack={currentIndex > 0}
          isLastStep={currentSlide?.id === "completion"}
        />
      </DialogContent>
    </Dialog>
  );
}
