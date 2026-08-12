"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, StatCard } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import {
  reportsApi,
  type ProfitLossReport,
} from "@/services/api";

type Mode = "weeks" | "months";

/** Only even week counts — 2 weeks and multiples of 2. */
const WEEK_OPTIONS = [2, 4, 6, 8, 10, 12] as const;
const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12] as const;

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

/** Today as YYYY-MM-DD in Asia/Karachi. */
function karachiTodayYMD(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function firstOfMonthYMD(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

function addMonthsYMD(ymd: string, months: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return dt.toISOString().slice(0, 10);
}

/**
 * Weeks mode: exactly `weeks` days ending today (inclusive), weeks ∈ {2,4,6…}.
 * Months mode: from the 1st of (current month − (n−1)) through today.
 */
function periodBounds(
  mode: Mode,
  weeks: number,
  months: number,
): { start: string; end: string; label: string } {
  const today = karachiTodayYMD();
  if (mode === "weeks") {
    const days = weeks * 7;
    const start = addDaysYMD(today, -(days - 1));
    return {
      start,
      end: today,
      label: `${weeks} weeks (${days} days)`,
    };
  }
  const start = firstOfMonthYMD(addMonthsYMD(today, -(months - 1)));
  return {
    start,
    end: today,
    label: months === 1 ? "This month" : `Last ${months} months`,
  };
}

export default function ProfitLossPage() {
  const [mode, setMode] = useState<Mode>("weeks");
  const [weeks, setWeeks] = useState<(typeof WEEK_OPTIONS)[number]>(2);
  const [months, setMonths] = useState<(typeof MONTH_OPTIONS)[number]>(1);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ProfitLossReport>(emptyReport);

  const bounds = useMemo(
    () => periodBounds(mode, weeks, months),
    [mode, weeks, months],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await reportsApi.profitLoss({
          start: bounds.start,
          end: bounds.end,
        });
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
  }, [bounds.start, bounds.end]);

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
        description="Sales minus expenses for 2-week blocks or full months. Monthly bills (salaries, rent) are split by days in the month."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card
          className={
            mode === "weeks"
              ? "border-orange-500/60 bg-orange-500/5"
              : "border-zinc-800"
          }
        >
          <button
            type="button"
            onClick={() => setMode("weeks")}
            className="mb-4 flex w-full items-center gap-2 text-left"
          >
            <CalendarRange className="h-5 w-5 text-orange-400" />
            <div>
              <h2 className="text-lg font-bold">By weeks</h2>
              <p className="text-sm text-zinc-400">
                Choose 2 weeks or any multiple of 2 weeks
              </p>
            </div>
          </button>
          <div className="flex flex-wrap gap-2">
            {WEEK_OPTIONS.map((n) => {
              const active = mode === "weeks" && weeks === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setMode("weeks");
                    setWeeks(n);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-bold ${
                    active
                      ? "bg-orange-500 text-black"
                      : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {n} weeks
                </button>
              );
            })}
          </div>
        </Card>

        <Card
          className={
            mode === "months"
              ? "border-orange-500/60 bg-orange-500/5"
              : "border-zinc-800"
          }
        >
          <button
            type="button"
            onClick={() => setMode("months")}
            className="mb-4 flex w-full items-center gap-2 text-left"
          >
            <CalendarDays className="h-5 w-5 text-orange-400" />
            <div>
              <h2 className="text-lg font-bold">By months</h2>
              <p className="text-sm text-zinc-400">
                One month or several months together
              </p>
            </div>
          </button>
          <div className="flex flex-wrap gap-2">
            {MONTH_OPTIONS.map((n) => {
              const active = mode === "months" && months === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setMode("months");
                    setMonths(n);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-bold ${
                    active
                      ? "bg-orange-500 text-black"
                      : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {n === 1 ? "1 month" : `${n} months`}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center text-zinc-400">
          Loading report...
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-zinc-500">
            {bounds.label}: {bounds.start} → {bounds.end} ·{" "}
            {report.completed_orders} completed orders
            {report.period_complete ? " · complete" : " · in progress"}
          </p>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Total sales"
              value={formatPrice(report.revenue)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <StatCard
              label="Total expenses"
              value={formatPrice(report.expenses)}
              hint="One-off + monthly share for this period"
              icon={<Wallet className="h-5 w-5" />}
            />
            <StatCard
              label="Profit"
              value={formatPrice(report.net_profit)}
              hint={
                report.net_profit >= 0
                  ? "Sales − expenses"
                  : "Expenses higher than sales"
              }
              icon={<TrendingDown className="h-5 w-5" />}
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
                value={formatPrice(report.avg_daily_revenue ?? 0)}
              />
              <StatCard
                label="Avg daily expenses"
                value={formatPrice(report.avg_daily_expenses ?? 0)}
              />
              <StatCard
                label="Avg daily profit"
                value={formatPrice(report.avg_daily_profit ?? 0)}
              />
            </div>
          </Card>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-lg font-bold">Expense breakdown</h2>
              {expenseBreakdown.length === 0 ? (
                <p className="text-zinc-400">
                  No expenses in this period. Add bills on the Expenses page
                  (use MONTHLY for salaries).
                </p>
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
              <h2 className="mb-4 text-lg font-bold">Best selling</h2>
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
