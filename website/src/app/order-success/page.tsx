import type { Metadata } from "next";
import { Suspense } from "react";
import OrderSuccessClient from "./order-success-client";

export const metadata: Metadata = {
  title: "Order Success",
  description: "Your Krunchies Pizza order has been placed successfully.",
};

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="p-10 text-zinc-500">Loading...</div>}>
      <OrderSuccessClient />
    </Suspense>
  );
}
