"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
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

  // Close drawer on route change — avoids stale overlay after navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-xl tracking-wide text-white sm:text-2xl"
        >
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

        <div className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="icon" className="relative h-11 w-11">
            <Link href="/cart" aria-label="Cart">
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-black">
                  {itemCount}
                </span>
              )}
            </Link>
          </Button>

          {isAuthenticated ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="max-w-[8rem] truncate text-sm text-zinc-400">
                {customer?.name}
              </span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="hidden h-11 w-11 sm:inline-flex"
            >
              <Link href="/login" aria-label="Login">
                <User className="h-5 w-5" />
              </Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-black px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-2 py-3 text-base font-medium",
                  pathname === link.href ? "text-orange-400" : "text-zinc-300",
                )}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <button
                type="button"
                className="rounded-md px-2 py-3 text-left text-base font-medium text-zinc-300"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
              >
                Logout{customer?.name ? ` (${customer.name})` : ""}
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-md px-2 py-3 text-base font-medium text-zinc-300"
              >
                Login
              </Link>
            )}
            <p className="px-2 pt-2 text-xs text-zinc-500">{SITE_NAME}</p>
          </nav>
        </div>
      )}
    </header>
  );
}
