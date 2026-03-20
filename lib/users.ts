import { UserProfile } from "../types";

const HTTP_URL_PATTERN = /^https?:\/\//i;

export function resolveDisplayName(
  profile: Partial<UserProfile> | null | undefined,
  fallbackUid: string,
): string {
  if (typeof profile?.name === "string" && profile.name.trim().length > 0) {
    return profile.name.trim();
  }

  if (typeof profile?.email === "string" && profile.email.trim().length > 0) {
    return profile.email.trim();
  }

  return fallbackUid;
}

export async function resolveProfilePhotoUrl(
  photoValue: string | null | undefined,
  uid?: string,
): Promise<string | null> {
  const candidate = typeof photoValue === "string" ? photoValue.trim() : "";

  if (!candidate) {
    // Return placeholder avatar if no photo URL
    return uid
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(uid)}&background=007AFF&color=fff&size=200`
      : null;
  }

  if (HTTP_URL_PATTERN.test(candidate)) {
    return candidate;
  }

  // Return placeholder avatar for any non-HTTP values
  return uid
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(uid)}&background=007AFF&color=fff&size=200`
    : null;
}
