import type { Metadata } from "next";
import { Suspense } from "react";
import MenuClient from "./menu-client";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Browse the full Krunchies Pizza menu — pizzas, sides, pasta, drinks, and desserts.",
};

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="p-10 text-zinc-500">Loading menu...</div>}>
      <MenuClient />
    </Suspense>
  );
}
