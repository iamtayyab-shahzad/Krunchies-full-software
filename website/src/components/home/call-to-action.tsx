"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function CallToAction() {
  return (
    <section className="relative overflow-hidden py-24">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=1600&q=80)",
        }}
      />
      <div className="absolute inset-0 bg-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-orange-600/30 to-transparent" />
      <motion.div
        className="relative mx-auto max-w-3xl px-4 text-center sm:px-6"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="font-display text-4xl text-white sm:text-5xl">
          Hungry? Your next favorite pizza is a tap away.
        </h2>
        <p className="mt-4 text-zinc-300">
          Browse the menu, customize your order, and get it delivered hot.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/menu">Start Ordering</Link>
        </Button>
      </motion.div>
    </section>
  );
}
