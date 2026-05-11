import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";
import { getUserData, Role } from "../api/userData";

type RoleState = {
  roles: Role[];
  activeRole: Role | null;
  setActiveRoleId: (id: string) => void;
  loading: boolean;
  reload: () => Promise<void>;
};

const ACTIVE_ROLE_KEY = "active.role.id";
const RoleContext = createContext<RoleState | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeRoleId, setActiveRoleIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getUserData();
      setRoles(data.roles || []);
      // Restore last-selected role from disk, falling back to first role.
      const saved = await AsyncStorage.getItem(ACTIVE_ROLE_KEY);
      const fallback = data.roles?.[0]?.id || null;
      const next = saved && data.roles.some((r) => r.id === saved) ? saved : fallback;
      setActiveRoleIdState(next);
    } catch {
      // backend unreachable — leave roles empty; screens show empty state
    } finally {
      setLoading(false);
    }
  };

  // Reload roles whenever the user changes (login/logout/demo).
  useEffect(() => {
    if (!user) {
      setRoles([]);
      setActiveRoleIdState(null);
      return;
    }
    load();
  }, [user?.id]);

  const setActiveRoleId = (id: string) => {
    setActiveRoleIdState(id);
    AsyncStorage.setItem(ACTIVE_ROLE_KEY, id).catch(() => {});
  };

  const activeRole = activeRoleId ? roles.find((r) => r.id === activeRoleId) || null : null;

  return (
    <RoleContext.Provider value={{ roles, activeRole, setActiveRoleId, loading, reload: load }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleState {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside <RoleProvider>");
  return ctx;
}
