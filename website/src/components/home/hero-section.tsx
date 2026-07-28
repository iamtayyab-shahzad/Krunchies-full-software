"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { restaurant } from "@/data/krunchies";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1920&q=80";

export function HeroSection() {
  return (
    <section className="relative min-h-[85svh] overflow-hidden sm:min-h-[100svh]">
      <Image
        src={HERO_IMAGE}
        alt=""
        fill
        priority
        quality={75}
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.25),transparent_50%)]" />

      <div className="relative mx-auto flex min-h-[85svh] max-w-7xl flex-col justify-center px-4 py-16 sm:min-h-[100svh] sm:px-6 sm:py-24 lg:px-8">
        <motion.p
          className="font-display text-4xl text-white sm:text-7xl md:text-8xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <span className="text-orange-500">Krunchies</span>
          <br />
          Pizza
        </motion.p>
        <motion.h1
          className="mt-4 max-w-xl text-base font-medium uppercase tracking-[0.14em] text-zinc-200 sm:mt-6 sm:text-2xl sm:tracking-[0.18em]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
        >
          {restaurant.tagline}
        </motion.h1>
        <motion.p
          className="mt-3 max-w-md text-sm text-zinc-400 sm:mt-4 sm:text-base"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18 }}
        >
          {restaurant.deliveryNote}. Open daily {restaurant.openingTime}–
          {restaurant.closingTime}.
        </motion.p>
        <motion.div
          className="mt-8 flex flex-wrap gap-3 sm:mt-10 sm:gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.26 }}
        >
          <Button asChild size="lg" className="min-h-12 min-w-[8.5rem]">
            <Link href="/menu">Order Now</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-h-12">
            <Link href="/about">Our Story</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
