"use client";

import { useEffect } from "react";

export default function OfflinePage() {
  // #region agent log
  useEffect(() => {
    fetch("http://127.0.0.1:7291/ingest/db8772f4-e46c-4a12-90e5-d51373bf23e5", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "ec6f7f",
      },
      body: JSON.stringify({
        sessionId: "ec6f7f",
        hypothesisId: "A",
        location: "offline/page.tsx:mount",
        message: "Offline stub page mounted (SW fallback likely)",
        data: {
          path: window.location.pathname,
          href: window.location.href,
          online: navigator.onLine,
          referrer: document.referrer,
        },
        timestamp: Date.now(),
        runId: "pre-fix",
      }),
    }).catch(() => {});
  }, []);
  // #endregion

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
      <h1 className="text-3xl font-black text-orange-500">Krunchies POS</h1>
      <p className="mt-3 max-w-md text-zinc-400">
        You are offline. Use New Order with cached products — orders will sync
        when internet returns.
      </p>
      <a
        href="/orders/new"
        className="mt-6 rounded-lg bg-orange-500 px-5 py-3 text-sm font-bold text-black"
      >
        Open New Order
      </a>
    </div>
  );
}
