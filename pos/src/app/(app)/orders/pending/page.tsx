"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { ordersApi } from "@/services/api";
import type { Order } from "@/types";

export default function PendingOrdersPage() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", "pending"],
    queryFn: ordersApi.pending,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["orders", "pending"] }),
      queryClient.invalidateQueries({ queryKey: ["orders"] }),
    ]);
  };

  const complete = async (order: Order) => {
    try {
      await ordersApi.complete(order.id);
      toast.success("Order completed");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete order");
    }
  };

  const cancel = async (order: Order) => {
    try {
      await ordersApi.cancel(order.id);
      toast.success("Order cancelled");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel order");
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-6 text-3xl font-black">Pending Orders</h1>
      <div className="space-y-3">
        {orders.map((order) => {
          return (
            <div
              key={order.id}
              className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-lg font-bold text-white">
                  {order.order_number} · {order.customer_name}
                </p>
                <p className="text-sm text-zinc-400">
                  {order.phone} · {order.order_type} · {order.items?.length ?? 0}{" "}
                  items · {formatPrice(order.grand_total)}
                </p>
                <p className="text-xs text-zinc-600">
                  Created {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => complete(order)}>Complete</Button>
                <Button variant="danger" onClick={() => cancel(order)}>
                  Cancel
                </Button>
              </div>
            </div>
          );
        })}
        {isLoading ? (
          <p className="text-zinc-500">Loading pending orders...</p>
        ) : !orders.length ? (
          <p className="text-zinc-500">No pending orders.</p>
        ) : null}
      </div>
    </div>
  );
}
