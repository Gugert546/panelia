import { createContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../../lib/firebase/client";
import { getRedirectResult } from "firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  // 👇 håndter redirect-resultat
  getRedirectResult(auth).catch(console.error);

  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    setUser(firebaseUser);
    setLoading(false);
  });

  return () => unsubscribe();
}, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};