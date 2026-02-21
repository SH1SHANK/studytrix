export interface UserProfileSettings {
  name: string;
  email: string;
}

export const DEFAULT_USER_PROFILE_SETTINGS: UserProfileSettings = {
  name: "",
  email: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function resolveUserProfileSettings(raw: unknown): UserProfileSettings {
  if (!isRecord(raw)) {
    return { ...DEFAULT_USER_PROFILE_SETTINGS };
  }

  return {
    name: typeof raw.name === "string" ? raw.name : "",
    email: typeof raw.email === "string" ? raw.email : "",
  };
}
