import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { HeroSection } from "@/components/home/hero-section";
import { OfferPopup } from "@/components/home/offer-popup";
import { pageSeo } from "@/lib/seo";

const FeaturedProducts = dynamic(() =>
  import("@/components/home/featured-products").then((m) => ({
    default: m.FeaturedProducts,
  })),
);
const PopularCategories = dynamic(() =>
  import("@/components/home/popular-categories").then((m) => ({
    default: m.PopularCategories,
  })),
);
const RestaurantStory = dynamic(() =>
  import("@/components/home/restaurant-story").then((m) => ({
    default: m.RestaurantStory,
  })),
);
const CustomerReviews = dynamic(() =>
  import("@/components/home/customer-reviews").then((m) => ({
    default: m.CustomerReviews,
  })),
);
const CallToAction = dynamic(() =>
  import("@/components/home/call-to-action").then((m) => ({
    default: m.CallToAction,
  })),
);

export const metadata: Metadata = pageSeo({
  title: "Krunchies Pizza | Fresh Pizza, Burgers & Fast Food",
  description:
    "Order fresh pizza, burgers, deals and shakes from Krunchies Pizza. Fast delivery and takeaway — crunchy, cheesy, irresistible.",
  path: "/",
  absoluteTitle: true,
});

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
