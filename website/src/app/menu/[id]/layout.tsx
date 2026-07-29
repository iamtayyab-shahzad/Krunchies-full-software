import type { Metadata } from "next";
import { products } from "@/data/krunchies";
import { pageSeo } from "@/lib/seo";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = products.find((p) => p.id === id);

  if (!product) {
    return pageSeo({
      title: "Product Details",
      description: "View Krunchies Pizza menu item details and add to your cart.",
      path: "/menu",
    });
  }

  const description =
    product.description?.trim() ||
    `Order ${product.name} from Krunchies Pizza — fresh and made to order.`;

  return pageSeo({
    title: `${product.name} | Krunchies Pizza`,
    description: description.slice(0, 160),
    path: `/menu/${product.id}`,
    absoluteTitle: true,
  });
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
