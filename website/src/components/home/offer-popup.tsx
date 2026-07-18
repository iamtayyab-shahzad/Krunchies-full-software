"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getOffers } from "@/services/api";
import type { Offer } from "@/types";

export function OfferPopup() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("krunchies_offer_dismissed");
    if (dismissed) return;

    getOffers().then((data) => {
      if (data[0]) {
        setOffer(data[0]);
        setTimeout(() => setOpen(true), 1200);
      }
    });
  }, []);

  const handleClose = (value: boolean) => {
    setOpen(value);
    if (!value) sessionStorage.setItem("krunchies_offer_dismissed", "1");
  };

  if (!offer) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <div className="relative aspect-[16/10]">
          <Image
            src={offer.image}
            alt={offer.title}
            fill
            className="object-cover"
            sizes="448px"
          />
        </div>
        <div className="space-y-4 p-6 pt-2">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-orange-400">
              {offer.title}
            </DialogTitle>
            <DialogDescription>{offer.description}</DialogDescription>
          </DialogHeader>
          <Button asChild className="w-full" onClick={() => handleClose(false)}>
            <Link href="/menu">Claim Offer</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
