"use client";

import { AuthProvider } from "@/context/auth-context";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster theme="dark" position="top-right" richColors />
    </AuthProvider>
  );
}
