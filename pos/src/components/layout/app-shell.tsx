"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar, TopBar } from "@/components/layout/shell";
import { useMenuSearch } from "@/context/menu-search-context";
import {
  TOKEN_KEY,
  isTokenExpired,
  isTillSessionValid,
} from "@/lib/utils";
import { isOnline } from "@/lib/network";
import { isLocalShopPos } from "@/lib/pos-mode";
import {
  sessionRepo,
  settingsApi,
  warmOfflineCache,
  productsApi,
  categoriesApi,
  locationsApi,
  ordersApi,
} from "@/services/api";

let offlineCacheWarmed = false;

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { search, setSearch } = useMenuSearch();
  const isNewOrder = pathname.startsWith("/orders/new");

  useEffect(() => {
    if (!isNewOrder) setSearch("");
  }, [isNewOrder, setSearch]);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
    retry: false,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const localShop = isLocalShopPos();
      let token = localStorage.getItem(TOKEN_KEY);
      const session = await sessionRepo.get();

      // Restore IndexedDB session when localStorage is empty or JWT expired.
      // Do this even when online — previously online+expired wiped the till.
      if (
        (!token || isTokenExpired(token)) &&
        isTillSessionValid(session, { localShop }) &&
        session?.token
      ) {
        localStorage.setItem(TOKEN_KEY, session.token);
        token = session.token;
      }

      const sessionOk = isTillSessionValid(session, { localShop });
      const hasUsableToken = Boolean(token) && sessionOk;

      if (!hasUsableToken) {
        // Local shop with saved till credentials: bounce to login page which
        // auto-signs in (no password UI). Cloud always shows password form.
        localStorage.removeItem(TOKEN_KEY);
        if (!cancelled) router.replace("/login");
        return;
      }

      // Warm catalog once per session; prefetch into React Query for New Order.
      if (isOnline() && !offlineCacheWarmed) {
        offlineCacheWarmed = true;
        void warmOfflineCache().then(() => {
          if (cancelled) return;
          void queryClient.prefetchQuery({
            queryKey: ["products"],
            queryFn: productsApi.list,
            staleTime: 5 * 60_000,
          });
          void queryClient.prefetchQuery({
            queryKey: ["categories"],
            queryFn: categoriesApi.list,
            staleTime: 5 * 60_000,
          });
          void queryClient.prefetchQuery({
            queryKey: ["locations"],
            queryFn: locationsApi.list,
            staleTime: 5 * 60_000,
          });
          void queryClient.prefetchQuery({
            queryKey: ["settings"],
            queryFn: settingsApi.get,
            staleTime: 5 * 60_000,
          });
          void queryClient.prefetchQuery({
            queryKey: ["orders", "pending"],
            queryFn: ordersApi.pending,
            staleTime: 2_000,
          });
        });
      } else if (!isOnline()) {
        void queryClient.prefetchQuery({
          queryKey: ["orders", "pending"],
          queryFn: ordersApi.pending,
          staleTime: 2_000,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, queryClient]);

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
