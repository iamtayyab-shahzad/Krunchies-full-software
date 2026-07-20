"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockOrders, type Order } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

export default function OrdersPage() {
  const [orders, setOrders] = useState(mockOrders);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Order | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.phone.includes(q),
    );
  }, [orders, query]);

  const openEdit = (order: Order) => {
    if (order.status !== "pending") {
      toast.error("Only pending orders can be edited");
      return;
    }
    setEditing(order);
    setEditName(order.customerName);
    setEditPhone(order.phone);
  };

  const saveEdit = () => {
    if (!editing) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === editing.id
          ? { ...o, customerName: editName, phone: editPhone }
          : o,
      ),
    );
    toast.success("Pending order updated");
    setEditing(null);
  };

  const setStatus = (id: string, status: Order["status"]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o)),
    );
    toast.success(`Order marked ${status}`);
  };

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Search, edit pending, complete, or cancel orders"
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            className="pl-10"
            placeholder="Search by order #, name, or phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[900px] text-left">
          <thead className="bg-zinc-950 text-sm uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id} className="border-t border-zinc-800">
                <td className="px-4 py-3">
                  <p className="font-bold">{order.orderNumber}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{order.customerName}</p>
                  <p className="text-sm text-zinc-400">{order.phone}</p>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-300">
                  {order.items.join(", ")}
                </td>
                <td className="px-4 py-3 font-bold text-orange-400">
                  {formatPrice(order.total)}
                </td>
                <td className="px-4 py-3">
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
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {order.status === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(order)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => setStatus(order.id, "completed")}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setStatus(order.id, "cancelled")}
                        >
                          <XCircle className="h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <span className="text-sm text-zinc-600">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pending Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={saveEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
