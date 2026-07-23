"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AUTH_KEY, POS_URL, TOKEN_KEY } from "@/lib/utils";
import { AuthUser, MOCK_USERS } from "@/lib/mock-data";
import { apiFetch } from "@/lib/api-client";

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<"admin" | "staff">;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Returns true when the JWT is missing, malformed, or past its `exp` claim.
// The backend rejects expired tokens with "invalid token", so the admin must
// treat an expired token as logged-out instead of only checking presence.
function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const parts = token.split(".");
  if (parts.length !== 3) return true;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (typeof payload.exp !== "number") return true;
    // 10s clock-skew leeway.
    return Math.floor(Date.now() / 1000) >= payload.exp - 10;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        const token = localStorage.getItem(TOKEN_KEY);
        if (parsed && token && !isTokenExpired(token)) {
          setUser(parsed);
        } else {
          // Expired/invalid session: clear it so the app routes to /login and
          // a fresh token is minted on the next sign-in.
          localStorage.removeItem(AUTH_KEY);
          localStorage.removeItem(TOKEN_KEY);
        }
      }
    } catch {
      localStorage.removeItem(AUTH_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    await new Promise((r) => setTimeout(r, 300));
    const match = MOCK_USERS.find(
      (u) =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        u.password === password,
    );
    if (!match) throw new Error("Invalid username or password");

    if (match.user.type === "staff") {
      return "staff" as const;
    }

    const resp = await apiFetch<{ token: string }>(
      "/auth/staff/login",
      {
        method: "POST",
        body: JSON.stringify({ username, password }),
      },
      false,
    );
    localStorage.setItem(TOKEN_KEY, resp.token);
    localStorage.setItem(AUTH_KEY, JSON.stringify(match.user));
    setUser(match.user);
    return "admin" as const;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, logout }),
    [user, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { POS_URL };
