"use client";

import { motion } from "framer-motion";

export function RestaurantStory() {
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
      <motion.div
        className="relative aspect-[4/3] overflow-hidden rounded-2xl"
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=1200&q=80)",
          }}
        />
        <div className="absolute inset-0 bg-orange-500/10" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
          Our Story
        </p>
        <h2 className="mt-2 font-display text-4xl text-white sm:text-5xl">
          Crafted with fire & passion
        </h2>
        <p className="mt-5 text-base leading-relaxed text-zinc-400">
          Krunchies Pizza started with one wood-fired oven and a simple belief:
          great pizza deserves great ingredients. Every dough is fermented for
          flavor, every topping is prepped fresh, and every order leaves our
          kitchen ready to impress.
        </p>
        <p className="mt-4 text-base leading-relaxed text-zinc-400">
          Today we serve neighborhoods across the city with the same obsession
          for crunch, melt, and heat that started it all.
        </p>
      </motion.div>
    </section>
  );
}
