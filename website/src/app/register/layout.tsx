import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a Krunchies Pizza customer account.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
