import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo({
  title: "Checkout",
  description:
    "Complete your Krunchies Pizza order securely and choose delivery or pickup.",
  path: "/checkout",
});

export default function CheckoutPage() {
  return <CheckoutForm />;
}
