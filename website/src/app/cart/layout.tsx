import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your Krunchies Pizza order before checkout.",
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
