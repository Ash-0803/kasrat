import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

const CONFIG_COLLECTION = "config";
const APP_DOC_ID = "app";
const DEFAULT_MIN_SESSIONS_FOR_STREAK = 3;

export let MIN_SESSIONS_FOR_STREAK = DEFAULT_MIN_SESSIONS_FOR_STREAK;

function parseMinSessions(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_MIN_SESSIONS_FOR_STREAK;
  }

  const rounded = Math.floor(value);
  return rounded > 0 ? rounded : DEFAULT_MIN_SESSIONS_FOR_STREAK;
}

export async function loadRemoteAppConfig(): Promise<number> {
  try {
    const snapshot = await getDoc(doc(db, CONFIG_COLLECTION, APP_DOC_ID));

    if (!snapshot.exists()) {
      MIN_SESSIONS_FOR_STREAK = DEFAULT_MIN_SESSIONS_FOR_STREAK;
      return MIN_SESSIONS_FOR_STREAK;
    }

    MIN_SESSIONS_FOR_STREAK = parseMinSessions(
      snapshot.data().minSessionsForStreak,
    );
    return MIN_SESSIONS_FOR_STREAK;
  } catch {
    MIN_SESSIONS_FOR_STREAK = DEFAULT_MIN_SESSIONS_FOR_STREAK;
    return MIN_SESSIONS_FOR_STREAK;
  }
}

export function subscribeToRemoteAppConfig(): () => void {
  const appConfigRef = doc(db, CONFIG_COLLECTION, APP_DOC_ID);

  return onSnapshot(
    appConfigRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        MIN_SESSIONS_FOR_STREAK = DEFAULT_MIN_SESSIONS_FOR_STREAK;
        return;
      }

      MIN_SESSIONS_FOR_STREAK = parseMinSessions(
        snapshot.data().minSessionsForStreak,
      );
    },
    () => {
      MIN_SESSIONS_FOR_STREAK = DEFAULT_MIN_SESSIONS_FOR_STREAK;
    },
  );
}
