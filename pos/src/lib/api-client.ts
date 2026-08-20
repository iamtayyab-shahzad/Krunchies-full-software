import type { ApiResponse } from "@/types";
import { TOKEN_KEY } from "@/lib/utils";
import {
  apiTimeoutMs,
  isOnline,
  markReachable,
  markUnreachable,
} from "@/lib/network";
import { isLocalShopPos } from "@/lib/pos-mode";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function clearSessionEverywhere() {
  setToken(null);
  try {
    const { clearSession } = await import("@/lib/offline-db");
    await clearSession();
  } catch {
    /* ignore */
  }
}

let silentReloginPromise: Promise<boolean> | null = null;

/**
 * Local shop only: refresh JWT with credentials saved after the first login.
 * Cloud / Vercel never stores or uses this path.
 */
async function trySilentShopRelogin(): Promise<boolean> {
  if (typeof window === "undefined" || !isLocalShopPos()) return false;
  if (!isOnline()) return false;
  if (silentReloginPromise) return silentReloginPromise;

  silentReloginPromise = (async () => {
    try {
      const { getShopTillCredentials, saveSession } = await import(
        "@/lib/offline-db"
      );
      const creds = await getShopTillCredentials();
      if (!creds) return false;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), apiTimeoutMs());
      let res: Response;
      try {
        res = await fetch(`${API_URL}/auth/staff/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: creds.username,
            password: creds.password,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      const json = (await res.json().catch(() => null)) as ApiResponse<{
        token: string;
      }> | null;
      if (!res.ok || !json?.success || !json.data?.token) return false;

      const token = json.data.token;
      setToken(token);
      let exp: number | null = null;
      try {
        const payload = JSON.parse(
          atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
        );
        exp = typeof payload.exp === "number" ? payload.exp : null;
      } catch {
        exp = null;
      }
      await saveSession({
        username: creds.username,
        token,
        exp,
        saved_at: new Date().toISOString(),
      });
      markReachable();
      return true;
    } catch {
      return false;
    } finally {
      silentReloginPromise = null;
    }
  })();

  return silentReloginPromise;
}

type FetchOpts = RequestInit & { __retriedAuth?: boolean };

export async function apiFetch<T>(
  path: string,
  options: FetchOpts = {},
  auth = true,
): Promise<T> {
  // Circuit breaker: skip network entirely while API is known dead.
  if (!isOnline()) {
    throw new ApiError("Network unavailable", 0);
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${API_URL}${path}`;
  const controller = new AbortController();
  const timeoutMs = apiTimeoutMs();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    markUnreachable();
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out", 0);
    }
    throw new ApiError("Network unavailable", 0);
  } finally {
    clearTimeout(timeout);
  }

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!res.ok || !json?.success) {
    if (res.status === 401 && typeof window !== "undefined") {
      const local = isLocalShopPos();
      if (local && auth && !options.__retriedAuth) {
        const refreshed = await trySilentShopRelogin();
        if (refreshed) {
          return apiFetch<T>(path, { ...options, __retriedAuth: true }, auth);
        }
        // Shop till: stay offline rather than bounce cashiers to a password form.
        markUnreachable();
        throw new ApiError("Session expired — sync paused until API is back", 401);
      }

      await clearSessionEverywhere();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    // Server errors that usually mean the host is sick — cool down.
    if ([408, 429, 502, 503, 504].includes(res.status)) {
      markUnreachable();
    }
    throw new ApiError(
      json?.message || `Request failed (${res.status})`,
      res.status,
    );
  }

  markReachable();
  return json.data;
}

export { API_URL };
