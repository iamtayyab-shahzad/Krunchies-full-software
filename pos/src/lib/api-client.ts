import type { ApiResponse } from "@/types";
import { TOKEN_KEY } from "@/lib/utils";

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
  // #region agent log
  fetch('http://127.0.0.1:7291/ingest/db8772f4-e46c-4a12-90e5-d51373bf23e5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5f52e'},body:JSON.stringify({sessionId:'b5f52e',runId:'pre-fix',hypothesisId:'A',location:'api-client.ts:fetch-start',message:'API fetch starting',data:{url,method:options.method||'GET',path,apiUrl:API_URL},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7291/ingest/db8772f4-e46c-4a12-90e5-d51373bf23e5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5f52e'},body:JSON.stringify({sessionId:'b5f52e',runId:'pre-fix',hypothesisId:'A',location:'api-client.ts:fetch-catch',message:'API fetch network failure',data:{url,errorName:err instanceof Error ? err.name : 'unknown',errorMessage:err instanceof Error ? err.message : String(err),online:typeof navigator!=='undefined'?navigator.onLine:null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw new ApiError("Network unavailable", 0);
  }
  // #region agent log
  fetch('http://127.0.0.1:7291/ingest/db8772f4-e46c-4a12-90e5-d51373bf23e5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5f52e'},body:JSON.stringify({sessionId:'b5f52e',runId:'pre-fix',hypothesisId:'B',location:'api-client.ts:fetch-response',message:'API fetch got response',data:{url,status:res.status,ok:res.ok},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!res.ok || !json?.success) {
    throw new ApiError(json?.message || `Request failed (${res.status})`, res.status);
  }

  return json.data;
}

export { API_URL };
