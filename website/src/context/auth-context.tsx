"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AUTH_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
} from "@/lib/constants";
import { loginCustomer, registerCustomer } from "@/services/api";
import type { Customer, LoginPayload, RegisterPayload } from "@/types";

interface AuthContextValue {
  customer: Customer | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<Customer>;
  register: (payload: RegisterPayload) => Promise<Customer>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (raw && token) setCustomer(JSON.parse(raw) as Customer);
    } catch {
      setCustomer(null);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (customer) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(customer));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [customer, hydrated]);

  const login = useCallback(async (payload: LoginPayload) => {
    const result = await loginCustomer(payload);
    setCustomer(result);
    return result;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const result = await registerCustomer(payload);
    setCustomer(result);
    return result;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setCustomer(null);
  }, []);

  const value = useMemo(
    () => ({
      customer,
      isAuthenticated: Boolean(customer),
      login,
      register,
      logout,
    }),
    [customer, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
