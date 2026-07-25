"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { BillProvider } from "@/context/bill-context";
import {
  POS_SYNC_COMPLETE_EVENT,
  startSyncEngine,
} from "@/lib/sync-engine";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
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
    window.addEventListener(POS_SYNC_COMPLETE_EVENT, onSync);
    return () => {
      stop?.();
      window.removeEventListener(POS_SYNC_COMPLETE_EVENT, onSync);
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
