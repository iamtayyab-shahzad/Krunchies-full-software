import type { Metadata } from "next";
import { CallToAction } from "@/components/home/call-to-action";
import { CustomerReviews } from "@/components/home/customer-reviews";
import { FeaturedProducts } from "@/components/home/featured-products";
import { HeroSection } from "@/components/home/hero-section";
import { OfferPopup } from "@/components/home/offer-popup";
import { PopularCategories } from "@/components/home/popular-categories";
import { RestaurantStory } from "@/components/home/restaurant-story";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Order premium handcrafted pizzas from Krunchies. Fast delivery, bold flavors, fire-baked perfection.",
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <OfferPopup />
      <FeaturedProducts />
      <PopularCategories />
      <RestaurantStory />
      <CustomerReviews />
      <CallToAction />
    </>
  );
}
