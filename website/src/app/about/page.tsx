import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn the story behind Krunchies Pizza — premium dough, bold flavors, and fire-baked craft.",
};

export default function AboutPage() {
  return (
    <div>
      <section className="relative min-h-[50vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=1600&q=80)",
          }}
        />
        <div className="absolute inset-0 bg-black/75" />
        <div className="relative mx-auto flex min-h-[50vh] max-w-7xl items-end px-4 pb-16 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
              About Us
            </p>
            <h1 className="mt-2 font-display text-6xl text-white sm:text-7xl">
              Krunchies Pizza
            </h1>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="font-display text-4xl text-white">
          Built for crunch. Obsessed with flavor.
        </h2>
        <div className="mt-6 space-y-4 text-zinc-400 leading-relaxed">
          <p>
            Krunchies Pizza was born from late-night oven experiments and a
            refusal to settle for soggy crust. We ferment our dough slowly,
            source quality cheeses, and finish every pie with the kind of heat
            that creates blistered edges and deep flavor.
          </p>
          <p>
            From classic Margherita to loaded meat feasts, every item on our
            menu is designed for people who take pizza seriously — without taking
            themselves too seriously.
          </p>
          <p>
            Whether you dine in spirit from home or grab a quick delivery, we
            bring restaurant-quality pizza with modern convenience.
          </p>
        </div>
        <Button asChild className="mt-10">
          <Link href="/menu">Explore the Menu</Link>
        </Button>
      </section>
    </div>
  );
}
