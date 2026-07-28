"use client";

import Image from "next/image";

const STORY_IMAGE =
  "https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=1200&q=80";

export function RestaurantStory() {
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:gap-12 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
        <Image
          src={STORY_IMAGE}
          alt="Krunchies kitchen"
          fill
          loading="lazy"
          quality={70}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-orange-500/10" />
      </div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
          Our Story
        </p>
        <h2 className="mt-2 font-display text-3xl text-white sm:text-5xl">
          Crafted with fire & passion
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:mt-5 sm:text-base">
          Krunchies Pizza started with one wood-fired oven and a simple belief:
          great pizza deserves great ingredients. Every dough is fermented for
          flavor, every topping is prepped fresh, and every order leaves our
          kitchen ready to impress.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:mt-4 sm:text-base">
          Today we serve neighborhoods across the city with the same obsession
          for crunch, melt, and heat that started it all.
        </p>
      </div>
    </section>
  );
}
