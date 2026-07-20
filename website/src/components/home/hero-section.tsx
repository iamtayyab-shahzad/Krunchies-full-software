"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { restaurant } from "@/data/krunchies";

export function HeroSection() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1920&q=80)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.25),transparent_50%)]" />

      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
        <motion.p
          className="font-display text-5xl text-white sm:text-7xl md:text-8xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="text-orange-500">Krunchies</span>
          <br />
          Pizza
        </motion.p>
        <motion.h1
          className="mt-6 max-w-xl text-xl font-medium uppercase tracking-[0.18em] text-zinc-200 sm:text-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          {restaurant.tagline}
        </motion.h1>
        <motion.p
          className="mt-4 max-w-md text-base text-zinc-400"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28 }}
        >
          {restaurant.deliveryNote}. Open daily {restaurant.openingTime}–
          {restaurant.closingTime}.
        </motion.p>
        <motion.div
          className="mt-10 flex flex-wrap gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <Button asChild size="lg">
            <Link href="/menu">Order Now</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/about">Our Story</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
