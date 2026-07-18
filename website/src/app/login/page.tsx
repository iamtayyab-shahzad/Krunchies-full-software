import type { Metadata } from "next";
import { Suspense } from "react";
import LoginClient from "./login-client";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Krunchies Pizza account.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-zinc-500">Loading...</div>}>
      <LoginClient />
    </Suspense>
  );
}
