"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { getReviews } from "@/services/api";
import type { Review } from "@/types";

export function CustomerReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    getReviews().then(setReviews);
  }, []);

  return (
    <section className="border-y border-white/5 bg-zinc-950/80 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
            Testimonials
          </p>
          <h2 className="mt-2 font-display text-4xl text-white sm:text-5xl">
            Customer Reviews
          </h2>
        </motion.div>
        <div className="grid gap-6 md:grid-cols-3">
          {reviews.map((review, i) => (
            <motion.blockquote
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-zinc-800 bg-black/40 p-6"
            >
              <div className="mb-3 flex gap-1">
                {Array.from({ length: review.rating }).map((_, idx) => (
                  <Star
                    key={idx}
                    className="h-4 w-4 fill-orange-500 text-orange-500"
                  />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">
                “{review.comment}”
              </p>
              <footer className="mt-4 text-sm font-semibold text-white">
                {review.name}
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
