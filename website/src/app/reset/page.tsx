import type { Metadata } from "next";
import { Suspense } from "react";
import ResetClient from "./reset-client";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo({
  title: "Reset Password",
  description: "Set a new password for your Krunchies Pizza account.",
  path: "/reset",
});

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="p-10 text-zinc-500">Loading...</div>}>
      <ResetClient />
    </Suspense>
  );
}
