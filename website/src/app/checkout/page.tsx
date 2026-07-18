import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Krunchies Pizza order.",
};

export default function CheckoutPage() {
  return <CheckoutForm />;
}
