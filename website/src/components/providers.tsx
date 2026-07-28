"use client";

import { AuthProvider } from "@/context/auth-context";
import { CartProvider, useCart } from "@/context/cart-context";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileCartBar } from "@/components/layout/mobile-cart-bar";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

function Shell({ children }: { children: React.ReactNode }) {
  const { itemCount } = useCart();
  return (
    <>
      <Header />
      <main className={cn("flex-1", itemCount > 0 && "pb-24 md:pb-0")}>
        {children}
      </main>
      <Footer />
      <MobileCartBar />
      <WhatsAppButton />
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "#18181b",
            border: "1px solid #3f3f46",
            color: "#fff",
          },
        }}
      />
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <Shell>{children}</Shell>
      </CartProvider>
    </AuthProvider>
  );
}
