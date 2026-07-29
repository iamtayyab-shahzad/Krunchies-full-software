import type { Metadata } from "next";
import { Suspense } from "react";
import MenuClient from "./menu-client";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo({
  title: "Krunchies Pizza Menu | Pizza, Burgers, Deals & Shakes",
  description:
    "Browse the full Krunchies Pizza menu — pizzas, burgers, rolls, pasta, fries, shakes, and family deals.",
  path: "/menu",
  absoluteTitle: true,
});

export default function MenuPage() {
  return (
    <Suspense
      fallback={<div className="p-10 text-zinc-500">Loading menu...</div>}
    >
      <MenuClient />
    </Suspense>
  );
}
