"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function OfflinePage() {
  const [redirecting, setRedirecting] = useState(false);

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
        runId: "post-fix",
      }),
    }).catch(() => {});
  }, []);
  // #endregion

  // Prefer the real POS shell when it is already cached.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const preferred = ["/orders/new", "/orders/pending", "/"];
        for (const path of preferred) {
          const hit =
            (await caches.match(path)) ||
            (await caches.match(new Request(path)));
          if (hit && !cancelled) {
            setRedirecting(true);
            window.location.replace(path);
            return;
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
      <h1 className="text-3xl font-black text-orange-500">Krunchies POS</h1>
      <p className="mt-3 max-w-md text-zinc-400">
        {redirecting
          ? "Opening cached POS…"
          : "You are offline. Open a cached screen — local orders stay on this device and sync when internet returns."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/orders/new"
          className="rounded-lg bg-orange-500 px-5 py-3 text-sm font-bold text-black"
        >
          New Order
        </Link>
        <Link
          href="/orders/pending"
          className="rounded-lg border border-zinc-600 bg-zinc-900 px-5 py-3 text-sm font-bold text-white"
        >
          Pending Orders
        </Link>
      </div>
    </div>
  );
}
