"use client";

import { AlertTriangle, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, StatCard } from "@/components/ui/card";
import {
  mockAnalytics,
  mockInventory,
} from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

export default function AnalyticsPage() {
  const lowStock = mockInventory.filter(
    (i) => i.currentStock <= i.minimumStock,
  );
  const maxPayment = Math.max(
    ...mockAnalytics.paymentBreakdown.map((p) => p.amount),
  );
  const maxSold = Math.max(...mockAnalytics.bestSelling.map((p) => p.sold));

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Sales performance, payments, and stock insights"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Today's Sales"
          value={formatPrice(mockAnalytics.todaySales)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Weekly Sales"
          value={formatPrice(mockAnalytics.weeklySales)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Monthly Sales"
          value={formatPrice(mockAnalytics.monthlySales)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-bold">Best Selling Products</h2>
          <div className="space-y-4">
            {mockAnalytics.bestSelling.map((item) => (
              <div key={item.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-orange-400">{item.sold} sold</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{ width: `${(item.sold / maxSold) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-bold">Payment Breakdown</h2>
          <div className="space-y-4">
            {mockAnalytics.paymentBreakdown.map((item) => (
              <div key={item.method}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{item.method}</span>
                  <span className="text-orange-400">
                    {formatPrice(item.amount)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-orange-400"
                    style={{
                      width: `${(item.amount / maxPayment) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-bold">Low Stock Summary</h2>
        </div>
        {lowStock.length === 0 ? (
          <p className="text-zinc-400">No low stock items right now.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lowStock.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3"
              >
                <p className="font-bold">{item.name}</p>
                <p className="text-sm text-zinc-400">
                  {item.currentStock} / min {item.minimumStock} {item.unit}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
