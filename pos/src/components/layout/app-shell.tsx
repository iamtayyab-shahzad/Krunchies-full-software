"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Sidebar, TopBar } from "@/components/layout/shell";
import { useBill } from "@/context/bill-context";
import { TOKEN_KEY, isTokenExpired } from "@/lib/utils";
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

      // Restore session from IndexedDB when localStorage is empty
      if (!token || isTokenExpired(token)) {
        const session = await sessionRepo.get();
        if (
          session?.token &&
          (!session.exp || session.exp * 1000 > Date.now())
        ) {
          localStorage.setItem(TOKEN_KEY, session.token);
          token = session.token;
        }
      }

      if (!token || isTokenExpired(token)) {
        localStorage.removeItem(TOKEN_KEY);
        await sessionRepo.clear();
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
  }, [router]);

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
