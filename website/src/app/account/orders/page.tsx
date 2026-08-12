import type { Metadata } from "next";
import MyOrdersClient from "./orders-client";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo({
  title: "My Orders",
  description: "Your recent Krunchies Pizza orders — reorder in one tap.",
  path: "/account/orders",
});

export default function MyOrdersPage() {
  return <MyOrdersClient />;
}
