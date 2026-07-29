import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo({
  title: "Contact Krunchies Pizza",
  description:
    "Get in touch with Krunchies Pizza for orders, feedback, delivery questions, or catering.",
  path: "/contact",
  absoluteTitle: true,
});

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
