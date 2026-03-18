import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth, db } from "../lib/firebase";
import { UserProfile } from "../types";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  profileLoading: boolean;
  onboardingRequired: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function fallbackUserProfile(user: User): UserProfile {
  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    photoURL: user.photoURL,
    role: "user",
    currentStreak: 0,
    longestStreak: 0,
    createdAt: Date.now(),
    completedOnboarding: false,
  };
}

function normalizeProfile(
  user: User,
  rawProfile: Partial<UserProfile>,
): UserProfile {
  return {
    uid: user.uid,
    email:
      typeof rawProfile.email === "string" || rawProfile.email === null
        ? rawProfile.email
        : user.email,
    name:
      typeof rawProfile.name === "string" || rawProfile.name === null
        ? rawProfile.name
        : user.displayName,
    photoURL:
      typeof rawProfile.photoURL === "string" || rawProfile.photoURL === null
        ? rawProfile.photoURL
        : user.photoURL,
    role: rawProfile.role === "admin" ? "admin" : "user",
    currentStreak:
      typeof rawProfile.currentStreak === "number"
        ? rawProfile.currentStreak
        : 0,
    longestStreak:
      typeof rawProfile.longestStreak === "number"
        ? rawProfile.longestStreak
        : 0,
    createdAt:
      typeof rawProfile.createdAt === "number"
        ? rawProfile.createdAt
        : Date.now(),
    pushToken:
      typeof rawProfile.pushToken === "string"
        ? rawProfile.pushToken
        : undefined,
    notificationPermissionBannerShown:
      typeof rawProfile.notificationPermissionBannerShown === "boolean"
        ? rawProfile.notificationPermissionBannerShown
        : undefined,
    completedOnboarding: rawProfile.completedOnboarding === true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    const userRef = doc(db, "users", user.uid);
    setProfileLoading(true);

    const unsubscribe = onSnapshot(
      userRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          const nextProfile = fallbackUserProfile(user);
          await setDoc(userRef, nextProfile, { merge: true });
          setProfile(nextProfile);
          setProfileLoading(false);
          return;
        }

        const normalized = normalizeProfile(
          user,
          snapshot.data() as Partial<UserProfile>,
        );

        setProfile(normalized);
        setProfileLoading(false);
      },
      () => {
        setProfile(null);
        setProfileLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!user?.uid || !profile || profile.completedOnboarding === true) {
      return;
    }

    const hasName =
      typeof profile.name === "string" && profile.name.trim().length > 0;
    const hasPhoto =
      typeof profile.photoURL === "string" &&
      profile.photoURL.trim().length > 0;

    if (hasName && hasPhoto) {
      void setDoc(
        doc(db, "users", user.uid),
        {
          completedOnboarding: true,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    }
  }, [profile, user?.uid]);

  const hasName =
    typeof profile?.name === "string" && profile.name.trim().length > 0;
  const hasPhoto =
    typeof profile?.photoURL === "string" && profile.photoURL.trim().length > 0;

  const onboardingRequired =
    !!user &&
    !authLoading &&
    !profileLoading &&
    profile !== null &&
    profile.completedOnboarding !== true &&
    (!hasName || !hasPhoto);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      authLoading,
      profileLoading,
      onboardingRequired,
      logout: async () => signOut(auth),
    }),
    [authLoading, onboardingRequired, profile, profileLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used inside AuthProvider");
  }

  return context;
}
