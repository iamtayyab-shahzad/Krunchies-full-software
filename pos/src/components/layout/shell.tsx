"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  FolderTree,
  History,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { listPendingActions } from "@/lib/offline-db";
import { syncOfflineQueue } from "@/services/api";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders/new", label: "New Order", icon: ShoppingCart },
  { href: "/orders/pending", label: "Pending Orders", icon: ClipboardList },
  { href: "/orders/history", label: "Order History", icon: History },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    const refresh = async () => {
      const pending = await listPendingActions();
      setQueueCount(pending.length);
      if (navigator.onLine && pending.length) {
        await syncOfflineQueue();
        const after = await listPendingActions();
        setQueueCount(after.length);
      }
    };
    refresh();
    const id = setInterval(refresh, 15000);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("online", refresh);
    };
  }, []);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-5">
        <p className="text-lg font-black text-white">
          <span className="text-orange-500">Krunchies</span> POS
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs">
          {online ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Wifi className="h-3.5 w-3.5" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-400">
              <WifiOff className="h-3.5 w-3.5" /> Offline
            </span>
          )}
          {queueCount > 0 && (
            <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-orange-300">
              {queueCount} queued
            </span>
          )}
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {LINKS.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-semibold transition-colors",
                active
                  ? "bg-orange-500 text-black"
                  : "text-zinc-300 hover:bg-zinc-900 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function TopBar({
  restaurantName,
  search,
  onSearch,
}: {
  restaurantName: string;
  search?: string;
  onSearch?: (v: string) => void;
}) {
  const router = useRouter();
  // Avoid SSR/client clock mismatch: only render time after mount
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    // #region agent log
    fetch('http://127.0.0.1:7291/ingest/db8772f4-e46c-4a12-90e5-d51373bf23e5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5f52e'},body:JSON.stringify({sessionId:'b5f52e',runId:'post-fix',hypothesisId:'H1',location:'shell.tsx:TopBar',message:'TopBar clock mounted client-only',data:{mounted:true},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return () => clearInterval(id);
  }, []);

  const clockLabel = now
    ? `${now.toLocaleDateString("en-PK", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })} · ${now.toLocaleTimeString("en-PK")}`
    : "\u00a0";

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-zinc-800 bg-black px-4">
      <div className="min-w-0">
        <p className="truncate text-lg font-black text-white">{restaurantName}</p>
        <p className="text-xs text-zinc-400" suppressHydrationWarning>
          {clockLabel}
        </p>
      </div>
      {onSearch && (
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search products..."
          className="ml-auto h-11 w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      )}
      <div className={cn("flex gap-2", !onSearch && "ml-auto")}>
        <button
          type="button"
          onClick={() => router.push("/orders/new")}
          className="h-11 rounded-lg bg-orange-500 px-4 text-sm font-bold text-black hover:bg-orange-400"
        >
          New Order
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("krunchies_pos_token");
            router.push("/login");
          }}
          className="h-11 rounded-lg border border-zinc-700 px-4 text-sm font-bold text-zinc-300 hover:bg-zinc-900"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
