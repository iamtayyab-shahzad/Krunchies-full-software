/**
 * Preferred "All Items" order: pizzas first, then most-ordered categories,
 * deals last. Matched by English category name from the catalog.
 */
export function categoryBrowseRank(name: string): number {
  const n = (name || "").toLowerCase().trim();

  if (n.includes("krunchies special pizza")) return 1;
  if (n === "special pizza" || (n.includes("special pizza") && !n.includes("krunchies")))
    return 2;
  if (n.includes("pizza")) return 0; // Pizza (Regular Flavour) and other pizza cats

  if (n.includes("special burger")) return 4;
  if (n === "burger" || (n.includes("burger") && !n.includes("special"))) return 3;

  if (n.includes("sandwich")) return 5;
  if (n.includes("paratha") || n.includes("roll")) return 6;
  if (n.includes("fried") || n.includes("chicken")) return 7;
  if (n.includes("pasta")) return 8;
  if (n.includes("fries") || n.includes("fry")) return 9;
  if (n.includes("shake")) return 10;
  if (n.includes("cold") || n.includes("drink")) return 11;
  if (n.includes("deal")) return 12;

  return 40;
}
