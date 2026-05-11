import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken } from "../api/client";
import { getMe, logout as apiLogout, User } from "../api/auth";

type AuthState = {
  user: User | null;
  loading: boolean;       // true while we check for a saved token on mount
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On app launch: if a token is saved, try to use it to fetch the user.
  // If the token is stale/invalid, fall back to logged-out state silently.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const me = await getMe();
        if (!cancelled) setUser(me);
      } catch {
        // token bad or backend unreachable — stay logged out
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    // Belt-and-suspenders: if the await chain above never reaches finally
    // (e.g. token is null path), still mark loading=false.
    return () => {
      cancelled = true;
    };
  }, []);

  // The getToken-then-getMe path above only hits finally if a token existed.
  // For the no-token case, flip loading off immediately on mount.
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) setLoading(false);
    })();
  }, []);

  const signOut = async () => {
    await apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
