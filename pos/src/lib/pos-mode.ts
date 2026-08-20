/**
 * Shop till vs cloud POS.
 * Local production shortcut always opens http://127.0.0.1:3001.
 * Vercel / any public host keeps staff password login.
 */

export function isLocalShopPos(
  hostname: string | null | undefined = typeof window !== "undefined"
    ? window.location.hostname
    : null,
): boolean {
  if (!hostname) return false;
  const host = hostname.trim().toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export function isCloudPos(
  hostname: string | null | undefined = typeof window !== "undefined"
    ? window.location.hostname
    : null,
): boolean {
  return !isLocalShopPos(hostname);
}
