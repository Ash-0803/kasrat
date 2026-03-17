import { format, subDays } from "date-fns";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { Session, SessionLog } from "../types";
import { db } from "./firebase";

const SESSIONS_COLLECTION = "sessions";
const LOGS_COLLECTION = "session_logs";

export const getTodaySessions = async (): Promise<Session[]> => {
  const today = format(new Date(), "yyyy-MM-dd");
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where("date", "==", today),
  );
  const snapshot = await getDocs(q);
  const sessions: Session[] = [];
  snapshot.forEach((docSnap) => {
    sessions.push({ id: docSnap.id, ...docSnap.data() } as Session);
  });
  return sessions.sort((a, b) => a.time.localeCompare(b.time));
};

export const getUserLogsForDate = async (
  uid: string,
  date: string,
): Promise<SessionLog[]> => {
  const q = query(
    collection(db, LOGS_COLLECTION),
    where("uid", "==", uid),
    where("date", "==", date),
  );
  const snapshot = await getDocs(q);
  const logs: SessionLog[] = [];
  snapshot.forEach((docSnap) => {
    logs.push({ id: docSnap.id, ...docSnap.data() } as SessionLog);
  });
  return logs;
};

export const claimSession = async (
  uid: string,
  sessionId: string,
): Promise<void> => {
  const date = format(new Date(), "yyyy-MM-dd");
  const logId = `${uid}_${sessionId}`;
  await setDoc(doc(db, LOGS_COLLECTION, logId), {
    id: logId,
    uid,
    sessionId,
    date,
    claimedAt: Date.now(),
    status: "claimed",
  } satisfies SessionLog);
};

export const skipSession = async (
  uid: string,
  sessionId: string,
): Promise<void> => {
  const date = format(new Date(), "yyyy-MM-dd");
  const logId = `${uid}_${sessionId}`;
  await setDoc(doc(db, LOGS_COLLECTION, logId), {
    id: logId,
    uid,
    sessionId,
    date,
    claimedAt: Date.now(),
    status: "skipped",
  } satisfies SessionLog);
};

export const updateSessionTime = async (
  sessionId: string,
  time: string,
): Promise<void> => {
  await updateDoc(doc(db, SESSIONS_COLLECTION, sessionId), {
    time,
    status: "active",
    updatedAt: Date.now(),
  });
};

export const cancelSession = async (
  sessionId: string,
  note?: string,
): Promise<void> => {
  const payload: Record<string, string | number> = {
    status: "cancelled",
    updatedAt: Date.now(),
  };

  const trimmedNote = note?.trim();
  if (trimmedNote) {
    payload.note = trimmedNote;
  }

  await updateDoc(doc(db, SESSIONS_COLLECTION, sessionId), payload);
};

export const getSessionsForDateRange = async (
  startDate: string,
  endDate: string,
): Promise<Session[]> => {
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
  );
  const snapshot = await getDocs(q);
  const sessions: Session[] = [];
  snapshot.forEach((docSnap) => {
    sessions.push({ id: docSnap.id, ...docSnap.data() } as Session);
  });
  // Descending by date, ascending by time within each date
  return sessions.sort((a, b) => {
    const dc = b.date.localeCompare(a.date);
    return dc !== 0 ? dc : a.time.localeCompare(b.time);
  });
};

export const getUserLogsForDateRange = async (
  uid: string,
  startDate: string,
  endDate: string,
): Promise<SessionLog[]> => {
  const q = query(
    collection(db, LOGS_COLLECTION),
    where("uid", "==", uid),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
  );
  const snapshot = await getDocs(q);
  const logs: SessionLog[] = [];
  snapshot.forEach((docSnap) => {
    logs.push({ id: docSnap.id, ...docSnap.data() } as SessionLog);
  });
  return logs;
};

// Re-export subDays so callers don't need a direct date-fns import
export { subDays };
