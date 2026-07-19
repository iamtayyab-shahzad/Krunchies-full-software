"use client";

import { useQuery } from "@tanstack/react-query";
import { formatPrice } from "@/lib/utils";
import { analyticsApi, settingsApi } from "@/services/api";

export default function AnalyticsPage() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  });
  const currency = settings?.currency || "Rs";

  const { data: today } = useQuery({
    queryKey: ["analytics", "today"],
    queryFn: analyticsApi.todaySales,
  });
  const { data: weekly } = useQuery({
    queryKey: ["analytics", "weekly"],
    queryFn: analyticsApi.weeklySales,
  });
  const { data: monthly } = useQuery({
    queryKey: ["analytics", "monthly"],
    queryFn: analyticsApi.monthlySales,
  });
  const { data: best = [] } = useQuery({
    queryKey: ["analytics", "best"],
    queryFn: analyticsApi.bestSelling,
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["analytics", "payments"],
    queryFn: analyticsApi.paymentBreakdown,
  });
  const { data: inventory } = useQuery({
    queryKey: ["analytics", "inventory"],
    queryFn: analyticsApi.remainingInventory,
  });
  const { data: cancelled } = useQuery({
    queryKey: ["analytics", "cancelled"],
    queryFn: analyticsApi.cancelled,
  });

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-6 text-3xl font-black">Analytics</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Today" value={formatPrice(today?.total || 0, currency)} />
        <Card title="Weekly" value={formatPrice(weekly?.total || 0, currency)} />
        <Card
          title="Monthly"
          value={formatPrice(monthly?.total || 0, currency)}
        />
        <Card title="Cancelled" value={String(cancelled?.count || 0)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="mb-4 text-xl font-bold">Top Selling Products</h2>
          <div className="space-y-2">
            {best.map((row, i) => (
              <div
                key={i}
                className="flex justify-between rounded-lg bg-black/40 px-3 py-2 text-sm"
              >
                <span>
                  {String(
                    row.name || row.product_name || row.Name || `Product ${i + 1}`,
                  )}
                </span>
                <span className="text-orange-400">
                  {String(row.total_qty || row.quantity || row.count || "-")}
                </span>
              </div>
            ))}
            {!best.length && (
              <p className="text-zinc-500">No sales data yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="mb-4 text-xl font-bold">Payment Breakdown</h2>
          <div className="space-y-2">
            {payments.map((row, i) => (
              <div
                key={i}
                className="flex justify-between rounded-lg bg-black/40 px-3 py-2 text-sm"
              >
                <span className="capitalize">
                  {String(row.payment_method || row.method || "-")}
                </span>
                <span className="text-orange-400">
                  {formatPrice(Number(row.total || row.amount || 0), currency)}
                </span>
              </div>
            ))}
            {!payments.length && (
              <p className="text-zinc-500">No payment data yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <h2 className="mb-4 text-xl font-bold">Inventory Summary</h2>
        <pre className="overflow-x-auto rounded-lg bg-black/50 p-4 text-xs text-zinc-300">
          {JSON.stringify(inventory ?? [], null, 2)}
        </pre>
      </section>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="mt-2 text-3xl font-black text-orange-400">{value}</p>
    </div>
  );
}
