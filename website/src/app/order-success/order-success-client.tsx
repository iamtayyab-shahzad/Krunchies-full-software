"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LAST_ORDER_KEY } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import type { Order } from "@/types";

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_ORDER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Order;
        if (!orderNumber || parsed.order_number === orderNumber) {
          setOrder(parsed);
        }
      }
    } catch {
      setOrder(null);
    }
  }, [orderNumber]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <CheckCircle2 className="mx-auto h-16 w-16 text-orange-500" />
      <h1 className="mt-6 font-display text-5xl text-white">Order Confirmed</h1>
      <p className="mt-3 text-zinc-400">
        Thank you! Your order has been received and is being prepared.
      </p>
      {(order?.order_number || orderNumber) && (
        <p className="mt-6 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-orange-300">
          Order Number:{" "}
          <span className="font-semibold text-white">
            {order?.order_number ?? orderNumber}
          </span>
        </p>
      )}
      {order && (
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-left text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Customer</span>
            <span className="text-white">{order.customer_name}</span>
          </div>
          <div className="mt-2 flex justify-between text-zinc-400">
            <span>Payment</span>
            <span className="capitalize text-white">{order.payment_method}</span>
          </div>
          <div className="mt-2 flex justify-between text-zinc-400">
            <span>Total</span>
            <span className="font-semibold text-orange-400">
              {formatPrice(order.grand_total)}
            </span>
          </div>
        </div>
      )}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/menu">Order Again</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back Home</Link>
        </Button>
      </div>
    </div>
  );
}
