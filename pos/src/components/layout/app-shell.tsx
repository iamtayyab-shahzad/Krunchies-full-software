"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Sidebar, TopBar } from "@/components/layout/shell";
import { useBill } from "@/context/bill-context";
import { TOKEN_KEY } from "@/lib/utils";
import { settingsApi } from "@/services/api";

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
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) router.replace("/login");
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
