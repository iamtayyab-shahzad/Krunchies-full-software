/** Strip non-digits and ensure country code for wa.me links. */
export function whatsAppDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    return `92${digits.slice(1)}`;
  }
  return digits;
}

export function whatsAppResetHref(phone: string): string {
  const to = whatsAppDigits(phone || "923001234567");
  return `https://wa.me/${to}?text=${encodeURIComponent("RESET")}`;
}
