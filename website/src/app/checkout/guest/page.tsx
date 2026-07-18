import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Guest Checkout",
  description: "Checkout as a guest without creating an account.",
};

export default function GuestCheckoutPage() {
  return <CheckoutForm guestMode />;
}
