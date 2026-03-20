import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "MISSING_API_KEY",
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "MISSING_AUTH_DOMAIN",
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "MISSING_PROJECT_ID",
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "MISSING_STORAGE_BUCKET",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    "MISSING_MESSAGING_SENDER_ID",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "MISSING_APP_ID",
};

// Debug: Log the config to check if env vars are loaded
console.log("Firebase Config:", firebaseConfig);

// Validate that all required fields are present
const requiredFields = ["apiKey", "authDomain", "projectId", "appId"];
const missingFields = requiredFields.filter(
  (field) =>
    !firebaseConfig[field as keyof typeof firebaseConfig] ||
    firebaseConfig[field as keyof typeof firebaseConfig].includes("MISSING_"),
);

if (missingFields.length > 0) {
  console.error("Missing Firebase configuration fields:", missingFields);
  throw new Error(
    `Missing Firebase configuration: ${missingFields.join(", ")}`,
  );
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
