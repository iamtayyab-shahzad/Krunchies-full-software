"use client";

import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useSettings } from "@/hooks/use-settings";

export function WhatsAppButton() {
  const { settings } = useSettings();
  const phone = settings?.whatsapp ?? "923001234567";
  const href = `https://wa.me/${phone}?text=${encodeURIComponent("Hi Krunchies! I'd like to place an order.")}`;

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/40"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 260, damping: 18 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
    >
      <MessageCircle className="h-7 w-7" />
    </motion.a>
  );
}
