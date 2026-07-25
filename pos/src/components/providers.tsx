"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { BillProvider } from "@/context/bill-context";
import {
  POS_SYNC_COMPLETE_EVENT,
  startSyncEngine,
} from "@/lib/sync-engine";
import { POS_ORDERS_CHANGED_EVENT } from "@/lib/offline-events";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
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
    const onSync = () => {
      void client.invalidateQueries({ queryKey: ["orders"] });
      void client.invalidateQueries({ queryKey: ["inventory"] });
      void client.invalidateQueries({ queryKey: ["products"] });
      void client.invalidateQueries({ queryKey: ["categories"] });
      void client.invalidateQueries({ queryKey: ["settings"] });
    };
    // Fired immediately after any local (offline) order mutation so the
    // Pending/History lists refresh from IndexedDB without waiting for a sync.
    const onOrdersChanged = () => {
      void client.invalidateQueries({ queryKey: ["orders"] });
    };
    window.addEventListener(POS_SYNC_COMPLETE_EVENT, onSync);
    window.addEventListener(POS_ORDERS_CHANGED_EVENT, onOrdersChanged);
    return () => {
      stop?.();
      window.removeEventListener(POS_SYNC_COMPLETE_EVENT, onSync);
      window.removeEventListener(POS_ORDERS_CHANGED_EVENT, onOrdersChanged);
    };
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      <BillProvider>
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "#18181b",
              border: "1px solid #3f3f46",
              color: "#fff",
              fontSize: "16px",
            },
          }}
        />
      </BillProvider>
    </QueryClientProvider>
  );
}
