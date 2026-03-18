import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { UserProfile } from "../types";
import { db, storage } from "./firebase";

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

export async function uploadAvatar(
  uid: string,
  fileUri: string,
): Promise<string> {
  const response = await fetch(fileUri);
  const blob = await response.blob();

  const avatarRef = ref(storage, `avatars/${uid}.jpg`);
  await uploadBytes(avatarRef, blob, { contentType: "image/jpeg" });

  return getDownloadURL(avatarRef);
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
