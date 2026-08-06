"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  Percent,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, StatCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/utils";
import {
  reportsApi,
  type ProfitLossReport,
} from "@/services/api";

type RangeKey = "week" | "month" | "today" | "custom";

const emptyReport: ProfitLossReport = {
  start: "",
  end: "",
  revenue: 0,
  completed_orders: 0,
  cancelled_orders: 0,
  cogs: 0,
  gross_profit: 0,
  expenses: 0,
  wastage_cost: 0,
  net_profit: 0,
  food_cost_percent: 0,
  inventory_value: 0,
  purchases_spend: 0,
  food_cost_source: "none",
  period_days: 0,
  elapsed_days: 0,
  period_complete: false,
  avg_daily_revenue: 0,
  avg_daily_expenses: 0,
  avg_daily_profit: 0,
  best_selling: [],
  least_selling: [],
  most_profitable: [],
  least_profitable: [],
  expense_breakdown: [],
};

function normalizeReport(
  data: Partial<ProfitLossReport> | null | undefined,
): ProfitLossReport {
  return {
    ...emptyReport,
    ...data,
    best_selling: data?.best_selling ?? [],
    least_selling: data?.least_selling ?? [],
    most_profitable: data?.most_profitable ?? [],
    least_profitable: data?.least_profitable ?? [],
    expense_breakdown: data?.expense_breakdown ?? [],
  };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function foodCostLabel(source: string | undefined) {
  if (source === "purchases") return "Stock buys (no recipes yet)";
  if (source === "cogs") return "Recipe COGS";
  return "Food cost (none logged)";
}

export default function ProfitLossPage() {
  const [range, setRange] = useState<RangeKey>("week");
  const [customStart, setCustomStart] = useState(daysAgoISO(30));
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ProfitLossReport>(emptyReport);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params =
          range === "custom"
            ? { start: customStart, end: customEnd }
            : { range };
        const data = await reportsApi.profitLoss(params);
        if (!cancelled) setReport(normalizeReport(data));
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e instanceof Error ? e.message : "Failed to load profit & loss",
          );
          setReport(emptyReport);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [range, customStart, customEnd]);

  const expenseBreakdown = report.expense_breakdown ?? [];
  const bestSelling = report.best_selling ?? [];

  const maxExpense = Math.max(
    1,
    ...expenseBreakdown.map((e) => Number(e.total || 0)),
  );
  const maxSold = Math.max(
    1,
    ...bestSelling.map((p) => Number(p.quantity || 0)),
  );

  const avgHint = report.period_complete
    ? `Full period ÷ ${report.period_days || report.elapsed_days || 1} days`
    : `So far ÷ ${report.elapsed_days || 1} days (period not finished)`;

  return (
    <div>
      <PageHeader
        title="Profit & Loss"
        description="Week/month sales minus expenses (recurring bills allocated). Day averages come from the period total."
      />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        {(
          [
            ["week", "This week"],
            ["month", "This month"],
            ["today", "Today"],
            ["custom", "Custom"],
          ] as const
        ).map(([key, label]) => {
          const active = range === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${
                active
                  ? "bg-orange-500 text-black"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {label}
            </button>
          );
        })}

        {range === "custom" ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-500">Start</Label>
              <Input
                type="date"
                className="w-auto"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-500">End</Label>
              <Input
                type="date"
                className="w-auto"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center text-zinc-400">
          Loading report...
        </div>
      ) : (
        <>
          {(report.start || report.end) && (
            <p className="mb-4 text-sm text-zinc-500">
              Period: {report.start?.slice(0, 10) || "—"} →{" "}
              {report.end?.slice(0, 10) || "—"} · {report.completed_orders}{" "}
              completed orders
              {report.period_complete ? " · complete" : " · in progress"}
            </p>
          )}

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Revenue"
              value={formatPrice(report.revenue)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <StatCard
              label="Food / stock cost"
              value={formatPrice(report.cogs)}
              hint={foodCostLabel(report.food_cost_source)}
              icon={<Boxes className="h-5 w-5" />}
            />
            <StatCard
              label="Expenses"
              value={formatPrice(report.expenses)}
              hint="Includes weekly/monthly share"
              icon={<Wallet className="h-5 w-5" />}
            />
            <StatCard
              label="Net Profit"
              value={formatPrice(report.net_profit)}
              hint={
                report.net_profit >= 0 ? "In the black" : "In the red"
              }
              icon={<TrendingDown className="h-5 w-5" />}
            />
            <StatCard
              label="Gross Profit"
              value={formatPrice(report.gross_profit)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <StatCard
              label="Wastage"
              value={formatPrice(report.wastage_cost)}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
            <StatCard
              label="Food Cost %"
              value={`${Number(report.food_cost_percent || 0).toFixed(1)}%`}
              icon={<Percent className="h-5 w-5" />}
            />
            <StatCard
              label="Stock buys (period)"
              value={formatPrice(report.purchases_spend)}
              hint={`On-hand value ${formatPrice(report.inventory_value)}`}
              icon={<Boxes className="h-5 w-5" />}
            />
          </div>

          <Card className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-orange-400" />
              <h2 className="text-lg font-bold">Average per day</h2>
            </div>
            <p className="mb-4 text-sm text-zinc-400">{avgHint}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Avg daily sales"
                value={formatPrice(report.avg_daily_revenue)}
              />
              <StatCard
                label="Avg daily expenses"
                value={formatPrice(report.avg_daily_expenses)}
              />
              <StatCard
                label="Avg daily profit"
                value={formatPrice(report.avg_daily_profit)}
              />
            </div>
          </Card>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-lg font-bold">Expense Breakdown</h2>
              {expenseBreakdown.length === 0 ? (
                <p className="text-zinc-400">No expenses in this period.</p>
              ) : (
                <div className="space-y-4">
                  {expenseBreakdown.map((item) => (
                    <div key={item.category}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold">{item.category}</span>
                        <span className="text-orange-400">
                          {formatPrice(Number(item.total || 0))}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-orange-500"
                          style={{
                            width: `${(Number(item.total || 0) / maxExpense) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h2 className="mb-4 text-lg font-bold">Best Selling</h2>
              {bestSelling.length === 0 ? (
                <p className="text-zinc-400">No sales in this period.</p>
              ) : (
                <div className="space-y-4">
                  {bestSelling.map((item) => (
                    <div key={item.product_id || item.product_name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold">
                          {item.product_name || "Unknown"}
                        </span>
                        <span className="text-orange-400">
                          {item.quantity} sold ·{" "}
                          {formatPrice(Number(item.revenue || 0))}
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
          </div>
        </>
      )}
    </div>
  );
}
