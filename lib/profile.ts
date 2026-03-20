import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { UserProfile } from "../types";
import { db } from "./firebase";

const LOGS_COLLECTION = "session_logs";
const USERS_COLLECTION = "users";

type UserStats = {
  totalVerified: number;
  totalClaimed: number;
  currentStreak: number;
  longestStreak: number;
};

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function subscribeToProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
) {
  const userRef = doc(db, USERS_COLLECTION, uid);

  return onSnapshot(userRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback(snapshot.data() as UserProfile);
  });
}

export async function updateProfile(uid: string, data: Partial<UserProfile>) {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, data);
}

export async function updateUserName(uid: string, name: string): Promise<void> {
  const nextName = normalizeName(name);

  if (!nextName) {
    throw new Error("Name cannot be empty.");
  }

  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    {
      name: nextName,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function updateUserPhoto(
  uid: string,
  photoURL: string,
): Promise<void> {
  const nextPhotoURL = photoURL.trim();

  if (!nextPhotoURL) {
    throw new Error("Photo URL cannot be empty.");
  }

  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    {
      photoURL: nextPhotoURL,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function uploadProfilePicture(uid: string, fileUri: string): Promise<string> {
  // Return a placeholder avatar URL instead of uploading to storage
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(uid)}&background=007AFF&color=fff&size=200`;
}

export function getProfilePictureUrl(uid: string): string | null {
  // Return a placeholder avatar URL
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(uid)}&background=007AFF&color=fff&size=200`;
}

export async function getLeaderboard(limitCount = 50): Promise<UserProfile[]> {
  const q = query(
    collection(db, USERS_COLLECTION),
    where("role", "==", "user"),
    orderBy("currentStreak", "desc"),
    orderBy("longestStreak", "desc"),
    orderBy("createdAt", "asc"),
    limit(limitCount),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as UserProfile);
}

export async function getShameEntries(date: string): Promise<UserProfile[]> {
  const shameRef = doc(db, "shame", date);
  const snapshot = await getDoc(shameRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.data();
  if (!data.entries) {
    return [];
  }

  const uids = Object.keys(data.entries);
  if (uids.length === 0) {
    return [];
  }

  const usersQuery = query(
    collection(db, USERS_COLLECTION),
    where("__name__", "in", uids),
  );
  const usersSnapshot = await getDocs(usersQuery);

  return usersSnapshot.docs.map((doc) => doc.data() as UserProfile);
}

export async function getUserStats(uid: string): Promise<UserStats> {
  const verifiedQuery = query(
    collection(db, LOGS_COLLECTION),
    where("uid", "==", uid),
    where("status", "==", "verified"),
  );

  const claimedQuery = query(
    collection(db, LOGS_COLLECTION),
    where("uid", "==", uid),
    where("status", "in", ["claimed", "verified", "lied"]),
  );

  const [userSnapshot, verifiedSnapshot, claimedSnapshot] = await Promise.all([
    getDoc(doc(db, USERS_COLLECTION, uid)),
    getCountFromServer(verifiedQuery),
    getCountFromServer(claimedQuery),
  ]);

  const userData = userSnapshot.exists()
    ? (userSnapshot.data() as Partial<UserProfile>)
    : null;

  return {
    totalVerified: verifiedSnapshot.data().count,
    totalClaimed: claimedSnapshot.data().count,
    currentStreak:
      typeof userData?.currentStreak === "number" ? userData.currentStreak : 0,
    longestStreak:
      typeof userData?.longestStreak === "number" ? userData.longestStreak : 0,
  };
}

export type { UserStats };
