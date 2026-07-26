"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ClipboardList,
  Package,
  Receipt,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import type { InventoryItem } from "@/lib/mock-data";
import { formatPrice, formatStock } from "@/lib/utils";
import {
  inventoryApi,
  ordersApi,
  type BackendOrder,
} from "@/services/api";

type StockBucket = {
  low: InventoryItem[];
  out: InventoryItem[];
  negative: InventoryItem[];
};

function stockTone(item: InventoryItem): "warning" | "danger" {
  if (item.currentStock < 0 || item.currentStock === 0) return "danger";
  return "warning";
}

function stockLabel(item: InventoryItem) {
  if (item.currentStock < 0) return "Negative";
  if (item.currentStock === 0) return "Out";
  return "Low";
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<{
    low: number;
    out: number;
    negative: number;
  }>({ low: 0, out: 0, negative: 0 });

  useEffect(() => {
    Promise.all([
      ordersApi.list(),
      inventoryApi.list(),
      inventoryApi.alerts().catch(() => null),
    ])
      .then(([orderRows, inventoryRows, alertRows]) => {
        setOrders(orderRows);
        setInventory(inventoryRows);
        if (alertRows) {
          setAlerts({
            low: alertRows.low_stock?.length || 0,
            out: alertRows.out_of_stock?.length || 0,
            negative: alertRows.negative_stock?.length || 0,
          });
        }
      })
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Failed to load dashboard",
        ),
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
      completedToday: completed.filter(
        (o) => new Date(o.created_at) >= startToday,
      ).length,
    };
  }, [orders]);

  const stockBuckets: StockBucket = useMemo(() => {
    const negative = inventory.filter((i) => i.currentStock < 0);
    const out = inventory.filter((i) => i.currentStock === 0);
    const low = inventory.filter(
      (i) => i.currentStock > 0 && i.currentStock <= i.minimumStock,
    );
    return { low, out, negative };
  }, [inventory]);

  const alertItems = [
    ...stockBuckets.negative,
    ...stockBuckets.out,
    ...stockBuckets.low,
  ];
  const alertCount =
    alerts.low + alerts.out + alerts.negative || alertItems.length;
  const recent = orders.slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Today’s overview for Krunchies Pizza"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href="/purchases">
            <ClipboardList className="h-4 w-4" />
            Purchases
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/profit-loss">
            <Receipt className="h-4 w-4" />
            Profit &amp; Loss
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/inventory">
            <Package className="h-4 w-4" />
            Inventory
          </Link>
        </Button>
      </div>

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
          hint={`${stats.completedToday} completed · ${alertCount} stock alerts`}
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
                      .map(
                        (item) =>
                          `${item.quantity}× ${item.product?.name || "Item"}`,
                      )
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
            {!recent.length ? (
              <p className="text-zinc-400">No orders yet.</p>
            ) : null}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold">Stock Alerts</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {(alerts.low || stockBuckets.low.length) > 0 ? (
                <Badge tone="warning">
                  {alerts.low || stockBuckets.low.length} low
                </Badge>
              ) : null}
              {(alerts.out || stockBuckets.out.length) > 0 ? (
                <Badge tone="danger">
                  {alerts.out || stockBuckets.out.length} out
                </Badge>
              ) : null}
              {(alerts.negative || stockBuckets.negative.length) > 0 ? (
                <Badge tone="danger">
                  {alerts.negative || stockBuckets.negative.length} negative
                </Badge>
              ) : null}
            </div>
          </div>
          {alertItems.length === 0 ? (
            <p className="text-zinc-400">All inventory levels look healthy.</p>
          ) : (
            <div className="space-y-3">
              {alertItems.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-amber-400" />
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-sm text-zinc-400">
                        Min{" "}
                        {formatStock(
                          item.minimumStock,
                          item.unit,
                          item.purchaseUnit,
                          item.unitsPerPurchase,
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge tone={stockTone(item)}>{stockLabel(item)}</Badge>
                    <p className="mt-1 font-black text-amber-400">
                      {formatStock(
                        item.currentStock,
                        item.unit,
                        item.purchaseUnit,
                        item.unitsPerPurchase,
                      )}
                    </p>
                  </div>
                </div>
              ))}
              {alertItems.length > 8 ? (
                <Link
                  href="/inventory"
                  className="block text-center text-sm font-bold text-orange-400 hover:underline"
                >
                  View all {alertItems.length} alerts in Inventory →
                </Link>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
