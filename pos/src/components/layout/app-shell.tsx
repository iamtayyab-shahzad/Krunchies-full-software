"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Sidebar, TopBar } from "@/components/layout/shell";
import { useBill } from "@/context/bill-context";
import { TOKEN_KEY, isTokenExpired, isOfflineSessionValid } from "@/lib/utils";
import { isOnline } from "@/lib/network";
import { sessionRepo, settingsApi, warmOfflineCache } from "@/services/api";

let offlineCacheWarmed = false;

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { search, setSearch } = useBill();
  const isNewOrder = pathname.startsWith("/orders/new");

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
    retry: false,
    staleTime: 60_000,
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

      if (!token || (isTokenExpired(token) && !allowOffline)) {
        localStorage.removeItem(TOKEN_KEY);
        if (isOnline()) await sessionRepo.clear();
        if (!cancelled) router.replace("/login");
        return;
      }

      // Warm IndexedDB once per session — not on every route change.
      if (isOnline() && !offlineCacheWarmed) {
        offlineCacheWarmed = true;
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
