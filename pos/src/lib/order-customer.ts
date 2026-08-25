/**
 * Cloud rejects blank customer_name. Walk-in UI auto-fills "Walk-in Customer",
 * but queued CREATEs can still be blank when:
 * - staff switched Walk-in → Phone (name cleared) then placed before typing a name
 *   on an older build that skipped validation, or
 * - a draft / resume carried an empty string into ordersApi.create.
 */

export function sanitizeOrderCustomerName(
  name: string | undefined | null,
  orderType: string,
): string {
  const trimmed = String(name ?? "").trim();
  if (trimmed) return trimmed;
  if (orderType === "walkin") return "Walk-in Customer";
  // Phone / website must not POST empty — last-resort label so sync is not dead-lettered.
  return "Customer";
}
