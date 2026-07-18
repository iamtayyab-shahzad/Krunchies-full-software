import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { settings } from "@/data/mock";
import { NAV_LINKS } from "@/lib/constants";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.3L16 11h-3V9c0-.6.4-1 1-1z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-zinc-950">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <p className="font-display text-2xl text-white">
            <span className="text-orange-500">Krunchies</span> Pizza
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
            Handcrafted pizzas, bold flavors, and premium ingredients. Fresh from
            our oven to your door.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-orange-400">
            Explore
          </h3>
          <ul className="mt-4 space-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/menu"
                className="text-sm text-zinc-400 transition-colors hover:text-white"
              >
                Order Online
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-orange-400">
            Contact
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-zinc-400">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-orange-500" />
              {settings.address}
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-orange-500" />
              <a href={`tel:${settings.phone}`} className="hover:text-white">
                {settings.phone}
              </a>
            </li>
            <li>
              Open daily {settings.opening_time} – {settings.closing_time}
            </li>
          </ul>
          <div className="mt-4 flex gap-3">
            <a
              href={settings.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-orange-400"
              aria-label="Facebook"
            >
              <FacebookIcon className="h-5 w-5" />
            </a>
            <a
              href={settings.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-orange-400"
              aria-label="Instagram"
            >
              <InstagramIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} Krunchies Pizza. All rights reserved.
      </div>
    </footer>
  );
}
