"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Package, ShoppingBag, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, StatCard } from "@/components/ui/card";
import type { InventoryItem } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";
import {
  inventoryApi,
  ordersApi,
  type BackendOrder,
} from "@/services/api";

export default function DashboardPage() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    Promise.all([ordersApi.list(), inventoryApi.list()])
      .then(([orderRows, inventoryRows]) => {
        setOrders(orderRows);
        setInventory(inventoryRows);
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Failed to load dashboard"),
      );
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startWeek = new Date(startToday);
    startWeek.setDate(startWeek.getDate() - 6);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const completed = orders.filter((o) => o.order_status === "COMPLETED");
    const sumSince = (from: Date) =>
      completed
        .filter((o) => new Date(o.created_at) >= from)
        .reduce((sum, o) => sum + o.grand_total, 0);
    return {
      today: sumSince(startToday),
      week: sumSince(startWeek),
      month: sumSince(startMonth),
      pending: orders.filter((o) => o.order_status === "PENDING").length,
      completedToday: completed.filter((o) => new Date(o.created_at) >= startToday)
        .length,
    };
  }, [orders]);

  const recent = orders.slice(0, 5);
  const lowStock = inventory.filter((i) => i.currentStock <= i.minimumStock);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Today’s overview for Krunchies Pizza"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value={formatPrice(stats.today)}
          hint="Completed orders"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Weekly Sales"
          value={formatPrice(stats.week)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Monthly Sales"
          value={formatPrice(stats.month)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Quick Stats"
          value={`${stats.pending} pending`}
          hint={`${stats.completedToday} completed · ${lowStock.length} low stock`}
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
                  <p className="font-bold text-white">{order.order_number}</p>
                  <p className="truncate text-sm text-zinc-400">
                    {order.customer_name} ·{" "}
                    {(order.items || [])
                      .map((item) => `${item.quantity}× ${item.product?.name || "Item"}`)
                      .join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-400">
                    {formatPrice(order.grand_total)}
                  </p>
                  <Badge
                    tone={
                      order.order_status === "COMPLETED"
                        ? "success"
                        : order.order_status === "CANCELLED"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {order.order_status}
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
