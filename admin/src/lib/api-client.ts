import { AUTH_KEY, TOKEN_KEY, API_URL } from "@/lib/utils";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

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

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${API_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError("Network unavailable", 0);
  }

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok || !json?.success) {
    // #region agent log
    try {
      const tk = getToken();
      let exp: number | null = null;
      let iat: number | null = null;
      if (tk && tk.split(".").length === 3) {
        try {
          const payload = JSON.parse(
            atob(tk.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
          );
          exp = payload.exp ?? null;
          iat = payload.iat ?? null;
        } catch {}
      }
      const nowSec = Math.floor(Date.now() / 1000);
      fetch(
        "http://127.0.0.1:7888/ingest/8bfa3430-75a3-4f8f-9f4b-0fb77dfcf7ef",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "ec6f7f",
          },
          body: JSON.stringify({
            sessionId: "ec6f7f",
            hypothesisId: "A/B/C/D",
            location: "api-client.ts:apiFetch",
            message: "request failed",
            data: {
              path,
              method: (options.method as string) || "GET",
              status: res.status,
              serverMessage: json?.message || null,
              tokenPresent: Boolean(tk),
              tokenLen: tk ? tk.length : 0,
              tokenParts: tk ? tk.split(".").length : 0,
              exp,
              iat,
              nowSec,
              expiredBySec: exp ? nowSec - exp : null,
              isExpired: exp ? nowSec >= exp : null,
            },
            timestamp: Date.now(),
          }),
        },
      ).catch(() => {});
    } catch {}
    // #endregion
    // An expired/invalid token is unrecoverable: clear the stale session and
    // send the user to /login so a fresh token can be minted.
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(AUTH_KEY);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    throw new ApiError(json?.message || `Request failed (${res.status})`, res.status);
  }

  return json.data;
}

