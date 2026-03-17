import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setUser(u);
    });
  }, []);

  return { user };
}
