"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { BillProvider } from "@/context/bill-context";
import { MenuSearchProvider } from "@/context/menu-search-context";
import { ThemeProvider, usePosTheme } from "@/context/theme-context";
import {
  POS_SYNC_COMPLETE_EVENT,
  startSyncEngine,
} from "@/lib/sync-engine";
import {
  POS_ORDERS_CHANGED_EVENT,
  POS_CACHE_UPDATED_EVENT,
} from "@/lib/offline-events";
import {
  listLocalOrders,
  listLocalPendingOrders,
} from "@/lib/offline-db";

function ThemedToaster() {
  const { theme } = usePosTheme();
  const light = theme === "light";
  return (
    <Toaster
      theme={light ? "light" : "dark"}
      position="top-center"
      toastOptions={{
        style: {
          background: light ? "#ffffff" : "#18181b",
          border: light ? "1px solid #d4d4d8" : "1px solid #3f3f46",
          color: light ? "#18181b" : "#fff",
          fontSize: "16px",
        },
      }}
    />
  );
}

async function hydrateOrdersFromIdb(client: QueryClient) {
  try {
    const [pending, all] = await Promise.all([
      listLocalPendingOrders(),
      listLocalOrders(),
    ]);
    client.setQueryData(["orders", "pending"], pending);
    client.setQueryData(["orders"], all);
  } catch {
    /* ignore */
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
            // Queries are backed by IndexedDB and work offline. The default
            // networkMode "online" pauses fetches (and refetchInterval) while
            // navigator.onLine is false, which would freeze the UI on cached
            // data. "always" lets our offline-aware queryFns run regardless.
            networkMode: "always",
          },
        },
      }),
  );

  useEffect(() => {
    const stop = startSyncEngine();
    // Local cashier mutations: paint from IndexedDB immediately — never wait on API.
    const onOrdersChanged = () => {
      void hydrateOrdersFromIdb(client);
      // Dashboard / Analytics today+weekly totals come from local COMPLETED orders.
      void client.invalidateQueries({ queryKey: ["analytics"] });
    };
    const onSync = () => {
      // Soft refresh from IDB first, then let localFirst revalidate in background.
      void hydrateOrdersFromIdb(client);
      void client.invalidateQueries({ queryKey: ["orders"] });
      void client.invalidateQueries({ queryKey: ["inventory"] });
      void client.invalidateQueries({ queryKey: ["analytics"] });
    };
    const onCacheUpdated = (e: Event) => {
      const keys =
        (e as CustomEvent<{ keys?: string[] }>).detail?.keys || [];
      for (const key of keys) {
        void client.invalidateQueries({ queryKey: [key] });
      }
    };
    window.addEventListener(POS_SYNC_COMPLETE_EVENT, onSync);
    window.addEventListener(POS_ORDERS_CHANGED_EVENT, onOrdersChanged);
    window.addEventListener(POS_CACHE_UPDATED_EVENT, onCacheUpdated);
    return () => {
      stop?.();
      window.removeEventListener(POS_SYNC_COMPLETE_EVENT, onSync);
      window.removeEventListener(POS_ORDERS_CHANGED_EVENT, onOrdersChanged);
      window.removeEventListener(POS_CACHE_UPDATED_EVENT, onCacheUpdated);
    };
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MenuSearchProvider>
          <BillProvider>
            {children}
            <ThemedToaster />
          </BillProvider>
        </MenuSearchProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
