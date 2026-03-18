import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  where,
} from "firebase/firestore";
import { SessionLog } from "../types";
import { db } from "./firebase";

const LOGS_COLLECTION = "session_logs";
const SESSIONS_COLLECTION = "sessions";

export async function getAllClaimedLogsForDate(
  date: string,
): Promise<SessionLog[]> {
  const logsQ = query(
    collection(db, LOGS_COLLECTION),
    where("date", "==", date),
    where("status", "==", "claimed"),
  );

  const snapshot = await getDocs(logsQ);
  const logs: SessionLog[] = [];

  snapshot.forEach((docSnap) => {
    logs.push({ id: docSnap.id, ...docSnap.data() } as SessionLog);
  });

  return logs.sort((a, b) => (b.claimedAt ?? 0) - (a.claimedAt ?? 0));
}

export async function getReviewedLogsForDate(
  date: string,
): Promise<SessionLog[]> {
  const logsQ = query(
    collection(db, LOGS_COLLECTION),
    where("date", "==", date),
    where("status", "in", ["verified", "lied"]),
  );

  const snapshot = await getDocs(logsQ);
  const logs: SessionLog[] = [];

  snapshot.forEach((docSnap) => {
    logs.push({ id: docSnap.id, ...docSnap.data() } as SessionLog);
  });

  return logs.sort((a, b) => (b.claimedAt ?? 0) - (a.claimedAt ?? 0));
}

async function updateLogStatus(
  logId: string,
  status: "verified" | "lied",
  adminUid: string,
): Promise<void> {
  const logRef = doc(db, LOGS_COLLECTION, logId);

  await runTransaction(db, async (transaction) => {
    const logSnap = await transaction.get(logRef);

    if (!logSnap.exists()) {
      throw new Error("Session log not found.");
    }

    transaction.update(logRef, {
      status,
      reviewedAt: Date.now(),
      reviewedBy: adminUid,
    });
  });
}

export async function verifyLog(logId: string, uid: string): Promise<void> {
  await updateLogStatus(logId, "verified", uid);
}

export async function flagAsLie(logId: string, uid: string): Promise<void> {
  await updateLogStatus(logId, "lied", uid);
}

export async function updateSessionTime(
  sessionId: string,
  newTime: string,
): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);

  await runTransaction(db, async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error("Session not found.");
    }

    transaction.update(sessionRef, {
      time: newTime,
      updatedAt: Date.now(),
    });
  });
}

export async function cancelSession(
  sessionId: string,
  adminUid: string,
): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);

  await runTransaction(db, async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error("Session not found.");
    }

    transaction.update(sessionRef, {
      status: "cancelled",
      cancelledBy: adminUid,
      updatedAt: Date.now(),
    });
  });
}
