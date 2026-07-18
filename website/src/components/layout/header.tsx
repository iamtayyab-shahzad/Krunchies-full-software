"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { NAV_LINKS, SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { isAuthenticated, customer, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-2xl tracking-wide text-white">
          <span className="text-orange-500">Krunchies</span> Pizza
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-orange-400",
                pathname === link.href ? "text-orange-400" : "text-zinc-300",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link href="/cart" aria-label="Cart">
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-black">
                  {itemCount}
                </span>
              )}
            </Link>
          </Button>

          {isAuthenticated ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm text-zinc-400">{customer?.name}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
              <Link href="/login" aria-label="Login">
                <User className="h-5 w-5" />
              </Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-black px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "text-base font-medium",
                  pathname === link.href ? "text-orange-400" : "text-zinc-300",
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="text-base font-medium text-zinc-300"
            >
              Login
            </Link>
            <p className="pt-2 text-xs text-zinc-500">{SITE_NAME}</p>
          </nav>
        </div>
      )}
    </header>
  );
}
