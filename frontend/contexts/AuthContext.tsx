"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface AuthUser {
  firstName: string;
  lastName: string;
  email: string;
  studyField: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  updateUser: (partial: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "calibrate_auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate on load. Replace this block with a real session/token check
  // once the backend exists (e.g. call /api/me and setUser from the response).
  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  const persist = (next: AuthUser | null) => {
    setUser(next);
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const login = (newUser: AuthUser) => persist(newUser);
  const logout = () => persist(null);
  const updateUser = (partial: Partial<AuthUser>) => {
    if (!user) return;
    persist({ ...user, ...partial });
  };

  // Avoid a flash of "logged out" UI while we check localStorage.
  if (!hydrated) return null;

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
