export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  role: "user" | "admin";
  currentStreak: number;
  longestStreak: number;
  createdAt: number; // Timestamp
  completedOnboarding?: boolean;
  pushToken?: string;
  notificationPermissionBannerShown?: boolean;
}

export interface Session {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: "active" | "cancelled";
  cancelledBy?: string; // uid
  note?: string;
}

export interface SessionLog {
  id: string;
  uid: string;
  sessionId: string;
  date: string;
  claimedAt?: number;
  status: "claimed" | "verified" | "lied" | "skipped";
}

export interface ShameEntry {
  uid: string;
  date: string;
  badgeLabel: string;
}
