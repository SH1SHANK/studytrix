"use client";

import { memo, useCallback } from "react";
import { IconAt, IconUser } from "@tabler/icons-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DEFAULT_USER_PROFILE_SETTINGS,
  resolveUserProfileSettings,
} from "@/features/profile/user-profile";
import { useSettingsStore } from "@/features/settings/settings.store";
import { useSetting } from "@/ui/hooks/useSettings";

function SettingUserProfileComponent() {
  const [rawValue, setValue] = useSetting("userProfile");
  const profile = resolveUserProfileSettings(rawValue);
  const compactModeEnabled = useSettingsStore((state) => {
    const candidate = state.values.compact_mode;
    return typeof candidate === "boolean" ? candidate : false;
  });

  const updateProfile = useCallback(
    (patch: Partial<typeof DEFAULT_USER_PROFILE_SETTINGS>) => {
      setValue({
        ...profile,
        ...patch,
      });
    },
    [profile, setValue],
  );

  return (
    <div
      className={cn(
        "border-b border-border/60 last:border-0",
        compactModeEnabled ? "px-2.5 py-3" : "px-3 py-3.5",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/50 text-muted-foreground">
          <IconUser className="size-[18px]" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[15px] leading-tight font-normal text-foreground">
            Profile
          </h3>
          <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
            Personal details used for greeting personalization.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2 pl-11">
        <div className="space-y-1">
          <label
            htmlFor="setting-user-profile-name"
            className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            Name
          </label>
          <Input
            id="setting-user-profile-name"
            type="text"
            value={profile.name}
            placeholder="What should we call you?"
            className="h-9 rounded-lg"
            onChange={(event) => {
              updateProfile({ name: event.target.value });
            }}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="setting-user-profile-email"
            className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            <IconAt className="size-3.5" />
            Email
          </label>
          <Input
            id="setting-user-profile-email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            value={profile.email}
            placeholder="Your email address"
            className="h-9 rounded-lg"
            onChange={(event) => {
              updateProfile({ email: event.target.value });
            }}
          />
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Your details are stored only on this device and will never be shared or used for marketing.
        </p>
      </div>
    </div>
  );
}

export const SettingUserProfile = memo(SettingUserProfileComponent);
