"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Sidebar, TopBar } from "@/components/layout/shell";
import { useBill } from "@/context/bill-context";
import { TOKEN_KEY, isTokenExpired, isOfflineSessionValid } from "@/lib/utils";
import { isOnline } from "@/lib/network";
import { sessionRepo, settingsApi, warmOfflineCache } from "@/services/api";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { search, setSearch } = useBill();
  const isNewOrder = pathname.startsWith("/orders/new");

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
    retry: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let token = localStorage.getItem(TOKEN_KEY);
      const session = await sessionRepo.get();

      // Restore session from IndexedDB when localStorage is empty / JWT expired.
      // Offline: allow grace period so cashiers keep selling without re-login.
      if (!token || isTokenExpired(token)) {
        if (isOfflineSessionValid(session) && session?.token) {
          if (!isOnline() || !token) {
            localStorage.setItem(TOKEN_KEY, session.token);
            token = session.token;
          }
        }
      }

      const allowOffline =
        !isOnline() && isOfflineSessionValid(session) && Boolean(token);

      // #region agent log
      fetch("http://127.0.0.1:7291/ingest/db8772f4-e46c-4a12-90e5-d51373bf23e5", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "ec6f7f",
        },
        body: JSON.stringify({
          sessionId: "ec6f7f",
          hypothesisId: "B",
          location: "app-shell.tsx:authGate",
          message: "AppShell auth gate decision",
          data: {
            hasToken: Boolean(token),
            expired: token ? isTokenExpired(token) : null,
            offlineSessionValid: isOfflineSessionValid(session),
            allowOffline,
            online: typeof navigator !== "undefined" ? navigator.onLine : null,
            path: pathname,
            willRedirectLogin:
              !token || (isTokenExpired(token) && !allowOffline),
          },
          timestamp: Date.now(),
          runId: "post-fix",
        }),
      }).catch(() => {});
      // #endregion

      if (!token || (isTokenExpired(token) && !allowOffline)) {
        localStorage.removeItem(TOKEN_KEY);
        if (isOnline()) await sessionRepo.clear();
        if (!cancelled) router.replace("/login");
        return;
      }

      if (isOnline()) {
        void warmOfflineCache();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-black text-white">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          restaurantName={settings?.restaurant_name || "Krunchies Pizza"}
          search={isNewOrder ? search : undefined}
          onSearch={isNewOrder ? setSearch : undefined}
        />
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
