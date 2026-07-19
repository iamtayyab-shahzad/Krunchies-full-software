"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import {
  analyticsApi,
  inventoryApi,
  ordersApi,
  settingsApi,
} from "@/services/api";

export default function DashboardPage() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  });
  const { data: today } = useQuery({
    queryKey: ["analytics", "today"],
    queryFn: analyticsApi.todaySales,
  });
  const { data: weekly } = useQuery({
    queryKey: ["analytics", "weekly"],
    queryFn: analyticsApi.weeklySales,
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: ordersApi.list,
  });
  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: inventoryApi.list,
  });

  const currency = settings?.currency || "Rs";
  const pending = orders.filter((o) => o.order_status === "PENDING").length;
  const lowStock = inventory.filter((i) => i.stock <= i.minimum_stock).length;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-black">Dashboard</h1>
        <Button asChild size="lg">
          <Link href="/orders/new">Start New Order</Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Today's Sales"
          value={formatPrice(today?.total || 0, currency)}
        />
        <Stat
          label="Weekly Sales"
          value={formatPrice(weekly?.total || 0, currency)}
        />
        <Stat label="Pending Orders" value={String(pending)} />
        <Stat label="Low Stock Items" value={String(lowStock)} warn={lowStock > 0} />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <QuickLink href="/orders/new" title="New Order" desc="Create walk-in or phone order" />
        <QuickLink href="/orders/pending" title="Pending" desc="Resume or complete saved orders" />
        <QuickLink href="/inventory" title="Inventory" desc="Check stock and recipes" />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-sm font-semibold text-zinc-400">{label}</p>
      <p
        className={`mt-2 text-3xl font-black ${warn ? "text-red-400" : "text-orange-400"}`}
      >
        {value}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-orange-500"
    >
      <p className="text-xl font-black text-white">{title}</p>
      <p className="mt-1 text-sm text-zinc-400">{desc}</p>
    </Link>
  );
}
