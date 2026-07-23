"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, StatCard } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import {
  analyticsApi,
  type AnalyticsBestSellingRow,
  type AnalyticsInventoryRow,
  type AnalyticsPaymentRow,
} from "@/services/api";

type AnalyticsState = {
  todaySales: number;
  yesterdaySales: number;
  weeklySales: number;
  monthlySales: number;
  cancelledOrders: number;
  bestSelling: AnalyticsBestSellingRow[];
  paymentBreakdown: AnalyticsPaymentRow[];
  lowStock: AnalyticsInventoryRow[];
};

const emptyAnalytics: AnalyticsState = {
  todaySales: 0,
  yesterdaySales: 0,
  weeklySales: 0,
  monthlySales: 0,
  cancelledOrders: 0,
  bestSelling: [],
  paymentBreakdown: [],
  lowStock: [],
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsState>(emptyAnalytics);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const settled = await Promise.allSettled([
          analyticsApi.todaySales(),
          analyticsApi.yesterdaySales(),
          analyticsApi.weeklySales(),
          analyticsApi.monthlySales(),
          analyticsApi.bestSellingProducts(),
          analyticsApi.cancelledOrders(),
          analyticsApi.paymentBreakdown(),
          analyticsApi.lowStock(),
        ]);
        if (cancelled) return;

        const val = <T,>(i: number, fallback: T): T => {
          const r = settled[i];
          return r.status === "fulfilled" ? (r.value as T) : fallback;
        };
        const today = val<{ total: number }>(0, { total: 0 });
        const yesterday = val<{ total: number }>(1, { total: 0 });
        const weekly = val<{ total: number }>(2, { total: 0 });
        const monthly = val<{ total: number }>(3, { total: 0 });
        const bestSelling = val<AnalyticsBestSellingRow[]>(4, []);
        const cancelledCount = val<{ count: number }>(5, { count: 0 });
        const payment = val<AnalyticsPaymentRow[]>(6, []);
        const lowStock = val<AnalyticsInventoryRow[]>(7, []);

        const failed = settled.filter((s) => s.status === "rejected").length;
        setData({
          todaySales: Number(today?.total ?? 0),
          yesterdaySales: Number(yesterday?.total ?? 0),
          weeklySales: Number(weekly?.total ?? 0),
          monthlySales: Number(monthly?.total ?? 0),
          cancelledOrders: Number(cancelledCount?.count ?? 0),
          bestSelling: Array.isArray(bestSelling) ? bestSelling : [],
          paymentBreakdown: Array.isArray(payment) ? payment : [],
          lowStock: Array.isArray(lowStock) ? lowStock : [],
        });
        // #region agent log
        fetch("http://127.0.0.1:7888/ingest/8bfa3430-75a3-4f8f-9f4b-0fb77dfcf7ef",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"ec6f7f"},body:JSON.stringify({sessionId:"ec6f7f",hypothesisId:"A1",location:"analytics/page.tsx:load",message:"analytics loaded",data:{today:today?.total,weekly:weekly?.total,monthly:monthly?.total,cancelled:cancelledCount?.count,bestLen:Array.isArray(bestSelling)?bestSelling.length:null,failed,statuses:settled.map(s=>s.status)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (failed === settled.length) {
          toast.error("Failed to load analytics — check login / backend");
        } else if (failed > 0) {
          toast.message(`Analytics partially loaded (${failed} requests failed)`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-zinc-400">
        Loading analytics...
      </div>
    );
  }

  const maxPayment = Math.max(
    1,
    ...data.paymentBreakdown.map((p) => Number(p.total || 0)),
  );
  const maxSold = Math.max(
    1,
    ...data.bestSelling.map((p) => Number(p.quantity || 0)),
  );

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Sales performance, payments, and stock insights"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Today's Sales"
          value={formatPrice(data.todaySales)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Yesterday's Sales"
          value={formatPrice(data.yesterdaySales)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Weekly Sales"
          value={formatPrice(data.weeklySales)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Monthly Sales"
          value={formatPrice(data.monthlySales)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Cancelled Orders"
          value={String(data.cancelledOrders)}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-bold">Best Selling Products</h2>
          {data.bestSelling.length === 0 ? (
            <p className="text-zinc-400">No completed sales yet.</p>
          ) : (
            <div className="space-y-4">
              {data.bestSelling.map((item) => (
                <div key={item.product_id || item.product_name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">
                      {item.product_name || "Unknown product"}
                    </span>
                    <span className="text-orange-400">
                      {item.quantity} sold
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{
                        width: `${(Number(item.quantity || 0) / maxSold) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-bold">Payment Breakdown</h2>
          {data.paymentBreakdown.length === 0 ? (
            <p className="text-zinc-400">No paid payments yet.</p>
          ) : (
            <div className="space-y-4">
              {data.paymentBreakdown.map((item) => (
                <div key={item.method}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">{item.method}</span>
                    <span className="text-orange-400">
                      {formatPrice(Number(item.total || 0))}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-orange-400"
                      style={{
                        width: `${(Number(item.total || 0) / maxPayment) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-bold">Low Stock Summary</h2>
        </div>
        {data.lowStock.length === 0 ? (
          <p className="text-zinc-400">No low stock items right now.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.lowStock.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3"
              >
                <p className="font-bold">{item.name}</p>
                <p className="text-sm text-zinc-400">
                  {item.stock} / min {item.minimum_stock} {item.unit}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
