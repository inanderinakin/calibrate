"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { tokens } from "@/lib/tokens";
import { fetchAccountName } from "@/lib/accountName";

export interface AuthUser {
  firstName: string;
  lastName: string;
  email: string;
  studyField: string;
  /** ISO alpha-2 code where we recognise the country, else the typed text. */
  country: string;
  joinedAt?: string;
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
const PROFILE_KEY = "calibrate_profile";

function readProfile(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    window.localStorage.removeItem(PROFILE_KEY);
    return null;
  }
}

export function clearStoredUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function clearStoredProfile() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(PROFILE_KEY);
}

export function saveProfile(profile: AuthUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

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

  // The stored name belongs to whichever device last wrote it, so a rename made on
  // another one never reached this sidebar until this device signed in again. One
  // request per page load, alongside the analysis the app already fetches, and only a
  // real answer is allowed to change anything.
  useEffect(() => {
    if (!hydrated) return;
    if (!tokens.getIdToken()) return;

    let cancelled = false;

    fetchAccountName().then((current) => {
      if (cancelled || !current) return;

      setUser((prev) => {
        if (!prev) return prev;
        if (prev.firstName === current.firstName && prev.lastName === current.lastName) {
          return prev;
        }

        const next = { ...prev, ...current };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  const persist = (next: AuthUser | null) => {
    setUser(next);
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } else {
      // Logout clears the session, but keeps the saved profile so the
      // account information survives a logout.
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const login = (newUser: AuthUser) => {
    const saved = readProfile();

    const merged: AuthUser = {
      ...saved,
      ...newUser,
      ...(newUser.firstName ? {} : { firstName: saved?.firstName ?? "" }),
      ...(newUser.lastName ? {} : { lastName: saved?.lastName ?? "" }),
      ...(newUser.studyField ? {} : { studyField: saved?.studyField ?? "" }),
      ...(newUser.country ? {} : { country: saved?.country ?? "" }),
      joinedAt: newUser.joinedAt ?? saved?.joinedAt ?? new Date().toISOString(),
    };

    persist(merged);
  };

  const logout = () => {
    tokens.clear();
    persist(null);
  };

  const updateUser = (partial: Partial<AuthUser>) => {
    const base = user ?? readProfile();
    if (!base) return;
    persist({ ...base, ...partial });
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
