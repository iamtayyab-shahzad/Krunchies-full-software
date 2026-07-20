"use client";

import { AlertTriangle, Package, ShoppingBag, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, StatCard } from "@/components/ui/card";
import {
  mockAnalytics,
  mockInventory,
  mockOrders,
} from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

export default function DashboardPage() {
  const recent = mockOrders.slice(0, 5);
  const lowStock = mockInventory.filter((i) => i.currentStock <= i.minimumStock);
  const pending = mockOrders.filter((o) => o.status === "pending").length;
  const completedToday = mockOrders.filter((o) => o.status === "completed").length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Today’s overview for Krunchies Pizza"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value={formatPrice(mockAnalytics.todaySales)}
          hint="Mock live total"
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
        <StatCard
          label="Quick Stats"
          value={`${pending} pending`}
          hint={`${completedToday} completed · ${lowStock.length} low stock`}
          icon={<ShoppingBag className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent Orders</h2>
            <Badge tone="orange">{recent.length} shown</Badge>
          </div>
          <div className="space-y-3">
            {recent.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-bold text-white">{order.orderNumber}</p>
                  <p className="truncate text-sm text-zinc-400">
                    {order.customerName} · {order.items.join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-400">
                    {formatPrice(order.total)}
                  </p>
                  <Badge
                    tone={
                      order.status === "completed"
                        ? "success"
                        : order.status === "cancelled"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold">Low Stock Items</h2>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-zinc-400">All inventory levels look healthy.</p>
          ) : (
            <div className="space-y-3">
              {lowStock.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-amber-400" />
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-sm text-zinc-400">
                        Min {item.minimumStock} {item.unit}
                      </p>
                    </div>
                  </div>
                  <p className="font-black text-amber-400">
                    {item.currentStock} {item.unit}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
