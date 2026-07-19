"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBill } from "@/context/bill-context";
import { deleteDraft, listDrafts } from "@/lib/offline-db";
import { formatPrice } from "@/lib/utils";
import type { PendingDraft } from "@/types";

export default function PendingOrdersPage() {
  const [drafts, setDrafts] = useState<PendingDraft[]>([]);
  const bill = useBill();
  const router = useRouter();

  const refresh = async () => setDrafts(await listDrafts());

  useEffect(() => {
    refresh();
  }, []);

  const resume = (draft: PendingDraft) => {
    bill.loadDraft({
      draftId: draft.id,
      orderType: draft.order_type,
      customerName: draft.customer_name,
      phone: draft.phone,
      address: draft.address,
      locationId: draft.location_id,
      deliveryCharge: draft.delivery_charge,
      paymentMethod: draft.payment_method,
      orderNotes: draft.order_notes,
      items: draft.items,
    });
    toast.success("Pending order loaded");
    router.push("/orders/new");
  };

  const remove = async (id: string) => {
    await deleteDraft(id);
    toast.message("Pending order removed");
    refresh();
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-6 text-3xl font-black">Pending Orders</h1>
      <div className="space-y-3">
        {drafts.map((d) => {
          const subtotal = d.items.reduce(
            (s, i) => s + i.price * i.quantity,
            0,
          );
          return (
            <div
              key={d.id}
              className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-lg font-bold text-white">{d.customer_name}</p>
                <p className="text-sm text-zinc-400">
                  {d.phone} · {d.order_type} · {d.items.length} items ·{" "}
                  {formatPrice(subtotal)}
                </p>
                <p className="text-xs text-zinc-600">
                  Updated {new Date(d.updated_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => resume(d)}>Resume</Button>
                <Button variant="danger" onClick={() => remove(d.id)}>
                  Delete
                </Button>
              </div>
            </div>
          );
        })}
        {!drafts.length && (
          <p className="text-zinc-500">No pending local orders.</p>
        )}
      </div>
    </div>
  );
}
