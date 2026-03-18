import { getDownloadURL, ref } from "firebase/storage";
import { UserProfile } from "../types";
import { storage } from "./firebase";

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
): Promise<string | null> {
  const candidate = typeof photoValue === "string" ? photoValue.trim() : "";

  if (!candidate) {
    return null;
  }

  if (HTTP_URL_PATTERN.test(candidate)) {
    return candidate;
  }

  try {
    return await getDownloadURL(ref(storage, candidate));
  } catch {
    return null;
  }
}
