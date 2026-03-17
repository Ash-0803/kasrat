import { format } from "date-fns";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { Session, SessionLog } from "../types";

export default function useTodaySessions(uid?: string) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [userLogs, setUserLogs] = useState<Record<string, SessionLog>>({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const sessionsQ = query(
      collection(db, "sessions"),
      where("date", "==", today),
    );
    const unsubscribe = onSnapshot(sessionsQ, (snapshot) => {
      const fetched: Session[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() } as Session);
      });
      fetched.sort((a, b) => a.time.localeCompare(b.time));
      setSessions(fetched);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [refreshKey]);

  useEffect(() => {
    if (!uid) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const logsQ = query(
      collection(db, "session_logs"),
      where("uid", "==", uid),
      where("date", "==", today),
    );
    const unsubscribe = onSnapshot(logsQ, (snapshot) => {
      const fetched: Record<string, SessionLog> = {};
      snapshot.forEach((docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() } as SessionLog;
        fetched[data.sessionId] = data;
      });
      setUserLogs(fetched);
    });
    return () => unsubscribe();
  }, [uid, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return { sessions, userLogs, loading, refresh };
}
