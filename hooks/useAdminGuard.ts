import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { UserProfile } from "../types";
import useAuth from "./useAuth";

export default function useAdminGuard(redirectIfNotAdmin = true) {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user?.uid) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));

        if (cancelled) {
          return;
        }

        if (!userSnap.exists()) {
          setProfile(null);
        } else {
          setProfile({ uid: user.uid, ...userSnap.data() } as UserProfile);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!redirectIfNotAdmin || loading) {
      return;
    }

    if (!isAdmin) {
      router.replace("/(tabs)/home");
    }
  }, [isAdmin, loading, redirectIfNotAdmin, router]);

  return { user, profile, isAdmin, loading };
}
