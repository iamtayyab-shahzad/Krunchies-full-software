"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PaymentQrPanel } from "@/components/checkout/payment-qr-panel";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { LAST_ORDER_KEY, PAYMENT_METHODS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { weekendPromoLabel } from "@/lib/weekend-promo";
import {
  evaluateNamalSlot,
  parseNamalDeliveryConfig,
  type NamalDeliveryConfig,
} from "@/lib/namal-delivery";
import { createOrder, getLocations, getSettings } from "@/services/api";
import { filterCheckoutLocations } from "@/lib/checkout-locations";
import type { Location, PaymentMethod, Settings } from "@/types";
import { AfterHoursNotice } from "@/components/checkout/after-hours-notice";
import {
  DEFAULT_SHOP_CLOSE,
  DEFAULT_SHOP_OPEN,
  afterHoursOrderNote,
  getShopHoursStatus,
} from "@/lib/shop-hours";

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2, "Name is required"),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => /^03\d{9}$/.test(v), {
      message: "Enter 11-digit mobile number (03XXXXXXXXX)",
    }),
  address: z.string().trim().min(5, "Address is required"),
  location_id: z.string().min(1, "Select a delivery location"),
  payment_method: z.enum(["easypaisa", "jazzcash", "bank", "cod"]),
  delivery_mode: z.enum(["asap", "scheduled"]),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

const FIELD_LABELS: Record<keyof CheckoutFormValues, string> = {
  customer_name: "Full name",
  phone: "Phone",
  address: "Delivery address",
  location_id: "Delivery location",
  payment_method: "Payment method",
  delivery_mode: "Delivery timing",
};

const FIELD_SCROLL_IDS: Partial<Record<keyof CheckoutFormValues, string>> = {
  customer_name: "customer_name",
  phone: "phone",
  address: "address",
  location_id: "checkout-location",
  payment_method: "checkout-payment",
  delivery_mode: "checkout-delivery-mode",
};

interface CheckoutFormProps {
  guestMode?: boolean;
}

export function CheckoutForm({ guestMode = false }: CheckoutFormProps) {
  const router = useRouter();
  const { items, subtotal, discount, payable, clearCart } = useCart();
  const { customer, isAuthenticated, saveCheckoutDefaults } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [namalCfg, setNamalCfg] = useState<NamalDeliveryConfig>(
    parseNamalDeliveryConfig(null),
  );
  const [submitting, setSubmitting] = useState(false);
  const [formBanner, setFormBanner] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  /** Same UUID for retries so backend returns one order (no double WhatsApp/POS). */
  const clientOrderIdRef = useRef<string | null>(null);
  const placingLockRef = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customer_name: "",
      phone: "",
      address: "",
      location_id: "",
      payment_method: "cod",
      delivery_mode: "asap",
    },
  });

  const locationId = watch("location_id");
  const paymentMethod = watch("payment_method");
  const deliveryMode = watch("delivery_mode");

  useEffect(() => {
    Promise.all([getLocations(), getSettings()])
      .then(([locationRows, restaurantSettings]) => {
        setLocations(locationRows);
        setSettings(restaurantSettings);
        setNamalCfg(parseNamalDeliveryConfig(restaurantSettings.namal_delivery));
      })
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load checkout settings",
        ),
      );
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!guestMode && customer) {
      setValue("customer_name", customer.name);
      setValue("phone", customer.phone);
      if (customer.default_address) {
        setValue("address", customer.default_address);
      }
      if (customer.default_location_id) {
        setValue("location_id", customer.default_location_id, {
          shouldValidate: true,
        });
      }
    }
  }, [customer, guestMode, setValue]);

  const namalSlot = useMemo(
    () => evaluateNamalSlot(namalCfg, locationId, new Date(nowTick)),
    [namalCfg, locationId, nowTick],
  );

  useEffect(() => {
    if (deliveryMode === "scheduled" && !namalSlot.freeSlotAvailable) {
      setValue("delivery_mode", "asap");
    }
  }, [deliveryMode, namalSlot.freeSlotAvailable, setValue]);

  useEffect(() => {
    if (formBanner) setFormBanner(null);
    // Clear sticky banner when user edits required fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, paymentMethod, deliveryMode]);

  const checkoutLocations = useMemo(
    () => filterCheckoutLocations(locations, namalCfg),
    [locations, namalCfg],
  );

  useEffect(() => {
    if (!locationId) return;
    if (!checkoutLocations.some((l) => l.id === locationId)) {
      setValue("location_id", "", { shouldValidate: false });
    }
  }, [checkoutLocations, locationId, setValue]);

  const baseDeliveryCharge = useMemo(() => {
    return (
      checkoutLocations.find((l) => l.id === locationId)?.delivery_charge ??
      locations.find((l) => l.id === locationId)?.delivery_charge ??
      0
    );
  }, [checkoutLocations, locations, locationId]);

  const deliveryCharge =
    deliveryMode === "scheduled" && namalSlot.freeSlotAvailable
      ? 0
      : baseDeliveryCharge;

  const codFee =
    paymentMethod === "cod" ? (settings?.cash_on_delivery_fee ?? 0) : 0;
  const grandTotal = payable + deliveryCharge + codFee;
  const currency = settings?.currency ?? "Rs";

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-5xl text-white">Checkout</h1>
        <p className="mt-4 text-zinc-400">Your cart is empty.</p>
        <Button asChild className="mt-8">
          <Link href="/menu">Browse Menu</Link>
        </Button>
      </div>
    );
  }

  const focusFirstError = (errs: FieldErrors<CheckoutFormValues>) => {
    const order: (keyof CheckoutFormValues)[] = [
      "customer_name",
      "phone",
      "address",
      "location_id",
      "delivery_mode",
      "payment_method",
    ];
    const first = order.find((key) => errs[key]);
    if (!first) return;
    const elId = FIELD_SCROLL_IDS[first];
    const el = elId ? document.getElementById(elId) : null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el instanceof HTMLElement && "focus" in el) {
      try {
        el.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    }
  };

  const onInvalid = (errs: FieldErrors<CheckoutFormValues>) => {
    const missing = (
      Object.keys(errs) as (keyof CheckoutFormValues)[]
    )
      .filter((k) => errs[k])
      .map((k) => FIELD_LABELS[k] || k);
    const msg =
      missing.length > 0
        ? `Please complete: ${missing.join(", ")}`
        : "Please fill in the required details above.";
    setFormBanner(msg);
    toast.error(msg, { duration: 4500 });
    focusFirstError(errs);
  };

  const onSubmit = async (values: CheckoutFormValues) => {
    if (placingLockRef.current || submitting) return;

    if (
      items.length === 0 ||
      items.some(
        (item) =>
          !item.product_id ||
          !item.size_id ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1,
      )
    ) {
      toast.error("Your cart contains invalid items. Please review it.");
      return;
    }

    placingLockRef.current = true;
    setSubmitting(true);
    setFormBanner(null);

    try {
      if (values.delivery_mode === "scheduled" && !namalSlot.freeSlotAvailable) {
        toast.error(
          namalSlot.hint ||
            "Namal free delivery slot is not available right now",
        );
        return;
      }

      if (!clientOrderIdRef.current) {
        clientOrderIdRef.current = crypto.randomUUID();
      }

      const hours = getShopHoursStatus(DEFAULT_SHOP_OPEN, DEFAULT_SHOP_CLOSE);
      const afterNote = afterHoursOrderNote(hours);

      const payload = {
        customer_name: values.customer_name,
        phone: values.phone,
        address: values.address,
        location_id: values.location_id,
        payment_method: values.payment_method,
        delivery_mode: values.delivery_mode,
        order_notes: afterNote || undefined,
        client_order_id: clientOrderIdRef.current,
        is_guest: guestMode || !isAuthenticated,
        items: items.map((item) => ({
          product_id: item.product_id,
          product_size_id: item.size_id,
          quantity: item.quantity,
          special_instructions: item.special_instructions,
        })),
      };
      const order = await createOrder(payload);
      clientOrderIdRef.current = null;
      localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
      if (isAuthenticated && !guestMode) {
        void saveCheckoutDefaults({
          name: values.customer_name,
          address: values.address,
          location_id: values.location_id,
        });
      }
      clearCart();
      toast.success(
        values.delivery_mode === "scheduled" && namalSlot.slotLabel
          ? `Order placed! Free delivery: ${namalSlot.slotLabel}`
          : hours.isOpen
            ? "Order placed successfully!"
            : hours.serveWhen === "today"
              ? `Order placed! We'll prepare it when we open today at ${hours.openLabel}.`
              : `Order placed! We'll prepare it tomorrow when we open at ${hours.openLabel}.`,
      );
      router.push(`/order-success?order=${order.order_number}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to place order. Please try again.",
      );
    } finally {
      placingLockRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-4xl text-white sm:text-5xl">
          {guestMode ? "Guest Checkout" : "Checkout"}
        </h1>
        <p className="mt-2 text-sm text-zinc-400 sm:text-base">
          {guestMode
            ? "Order without creating an account."
            : isAuthenticated
              ? "Review your details and place your order."
              : "Login for a faster checkout, or continue as guest."}
        </p>
        {!guestMode && !isAuthenticated && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/login?redirect=/checkout">Customer Login</Link>
            </Button>
            <Button asChild variant="secondary" className="min-h-11">
              <Link href="/checkout/guest">Continue as Guest</Link>
            </Button>
          </div>
        )}
        <AfterHoursNotice className="mt-4" />
        {namalCfg.enabled ? (
          <div className="mt-4 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
            <p className="font-semibold text-orange-300">Namal student offer</p>
            <p className="mt-1 text-zinc-300">
              Choose <strong>Namal University</strong> or{" "}
              <strong>Namal Hostel</strong>, then pick{" "}
              <strong>Deliver now</strong> (paid) or{" "}
              <strong>Free delivery</strong> when the time window is open.
            </p>
          </div>
        ) : null}
      </div>

      <form
        id="checkout-form"
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="grid gap-8 pb-36 lg:grid-cols-[1fr_360px] lg:gap-10 lg:pb-0"
      >
        <div className="space-y-6 sm:space-y-8">
          <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-white">
              Customer Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Full Name</Label>
                <Input
                  id="customer_name"
                  className="min-h-11"
                  {...register("customer_name", {
                    onChange: () => setFormBanner(null),
                  })}
                />
                {errors.customer_name && (
                  <p className="text-xs text-red-400">
                    {errors.customer_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  className="min-h-11"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="03XXXXXXXXX"
                  maxLength={11}
                  {...register("phone", {
                    onChange: (e) => {
                      setFormBanner(null);
                      const digits = String(e.target.value || "")
                        .replace(/\D/g, "")
                        .slice(0, 11);
                      e.target.value = digits;
                    },
                  })}
                />
                {errors.phone && (
                  <p className="text-xs text-red-400">{errors.phone.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Delivery Address</Label>
              <Textarea
                id="address"
                {...register("address", {
                  onChange: () => setFormBanner(null),
                })}
              />
              {errors.address && (
                <p className="text-xs text-red-400">{errors.address.message}</p>
              )}
            </div>
            <div className="space-y-2" id="checkout-location">
              <Label>Location</Label>
              <Select
                value={locationId}
                onValueChange={(value) =>
                  setValue("location_id", value, { shouldValidate: true })
                }
              >
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="Select delivery area" />
                </SelectTrigger>
                <SelectContent>
                  {checkoutLocations.map((loc) => {
                    const isNamal =
                      namalCfg.enabled &&
                      (loc.id === namalCfg.campus_location_id ||
                        loc.id === namalCfg.hostel_location_id);
                    return (
                      <SelectItem key={loc.id} value={loc.id}>
                        {isNamal
                          ? `${loc.name} — Deliver now or Free delivery`
                          : `${loc.name} — ${formatPrice(loc.delivery_charge, currency)}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.location_id && (
                <p className="text-xs text-red-400">
                  {errors.location_id.message}
                </p>
              )}
            </div>

            {namalCfg.enabled && namalSlot.site ? (
              <div
                id="checkout-delivery-mode"
                className="space-y-3 rounded-lg border border-orange-500/30 bg-orange-500/5 p-4"
              >
                <p className="font-semibold text-orange-300">Delivery timing</p>
                <RadioGroup
                  value={deliveryMode}
                  onValueChange={(value) =>
                    setValue("delivery_mode", value as "asap" | "scheduled", {
                      shouldValidate: true,
                    })
                  }
                  className="space-y-2"
                >
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-800 p-3 has-[[data-state=checked]]:border-orange-500">
                    <RadioGroupItem value="asap" className="mt-1" />
                    <div>
                      <p className="font-medium text-white">Deliver now</p>
                      <p className="text-sm text-zinc-400">
                        Get it as soon as possible · fee{" "}
                        {formatPrice(baseDeliveryCharge, currency)}
                      </p>
                    </div>
                  </label>
                  <label
                    className={`flex items-start gap-3 rounded-lg border border-zinc-800 p-3 ${
                      namalSlot.freeSlotAvailable
                        ? "cursor-pointer has-[[data-state=checked]]:border-orange-500"
                        : "cursor-not-allowed opacity-60"
                    }`}
                  >
                    <RadioGroupItem
                      value="scheduled"
                      className="mt-1"
                      disabled={!namalSlot.freeSlotAvailable}
                    />
                    <div>
                      <p className="font-medium text-white">Free delivery</p>
                      {namalSlot.freeSlotAvailable ? (
                        <p className="text-sm text-emerald-400">
                          Arrives {namalSlot.slotLabel} · Rs 0
                        </p>
                      ) : (
                        <p className="text-sm text-zinc-400">{namalSlot.hint}</p>
                      )}
                    </div>
                  </label>
                </RadioGroup>
                {namalSlot.freeSlotAvailable && deliveryMode === "scheduled" ? (
                  <p className="text-xs text-zinc-400">{namalSlot.hint}</p>
                ) : null}
              </div>
            ) : namalCfg.enabled && namalSlot.hint ? (
              <p className="text-sm text-zinc-400">{namalSlot.hint}</p>
            ) : null}
          </section>

          <section
            id="checkout-payment"
            className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6"
          >
            <h2 className="text-lg font-semibold text-white">Payment Method</h2>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) =>
                setValue("payment_method", value as PaymentMethod, {
                  shouldValidate: true,
                })
              }
              className="space-y-3"
            >
              {PAYMENT_METHODS.map((method) => {
                const selected = paymentMethod === method.id;
                return (
                  <div
                    key={method.id}
                    className="rounded-lg border border-zinc-800 transition-colors hover:border-zinc-600 has-[[data-state=checked]]:border-orange-500"
                  >
                    <label className="flex min-h-14 cursor-pointer items-start gap-3 p-4">
                      <RadioGroupItem value={method.id} className="mt-1" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{method.label}</p>
                        <p className="text-sm text-zinc-400">
                          {method.description}
                        </p>
                        {method.id === "cod" && (
                          <p className="mt-1 text-xs text-orange-400">
                            +
                            {formatPrice(
                              settings?.cash_on_delivery_fee ?? 0,
                              currency,
                            )}{" "}
                            fee
                          </p>
                        )}
                      </div>
                    </label>
                    {selected && method.id !== "cod" ? (
                      <div className="border-t border-zinc-800 px-4 pb-4 pt-0">
                        <PaymentQrPanel method={method.id} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </RadioGroup>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-zinc-800 bg-zinc-950 p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold text-white">Order Summary</h2>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex justify-between gap-3 text-sm text-zinc-400"
              >
                <span>
                  {item.quantity}× {item.product_name} ({item.size})
                </span>
                <span className="shrink-0 text-white">
                  {formatPrice(item.price * item.quantity, currency)}
                </span>
              </li>
            ))}
          </ul>
          <Separator className="my-4" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between text-emerald-400">
                <span>{weekendPromoLabel(items) || "Promo discount"}</span>
                <span>-{formatPrice(discount, currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-zinc-400">
              <span>
                Delivery
                {deliveryMode === "scheduled" && namalSlot.freeSlotAvailable
                  ? ` (${namalSlot.slotLabel})`
                  : ""}
              </span>
              <span>
                {!locationId
                  ? "Select location"
                  : deliveryCharge === 0
                    ? "Free"
                    : formatPrice(deliveryCharge, currency)}
              </span>
            </div>
            {codFee > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>COD Fee</span>
                <span>{formatPrice(codFee, currency)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 text-base font-semibold text-white">
              <span>Grand Total</span>
              <span className="text-orange-400">
                {formatPrice(grandTotal, currency)}
              </span>
            </div>
          </div>
          {formBanner ? (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {formBanner}
            </p>
          ) : null}
          <Button
            type="submit"
            className="mt-6 hidden min-h-12 w-full lg:flex"
            size="lg"
            disabled={submitting}
          >
            {submitting ? "Placing Order..." : "Place Order"}
          </Button>
        </aside>

        {/* Mobile sticky place-order — desktop uses sidebar button */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-black/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm lg:hidden">
          {formBanner ? (
            <p className="mb-2 rounded-md border border-red-500/40 bg-red-500/15 px-3 py-2 text-center text-xs font-medium text-red-300">
              {formBanner}
            </p>
          ) : null}
          <div className="mb-2 flex items-center justify-between text-sm text-zinc-300">
            <span>Total</span>
            <span className="font-semibold text-orange-400">
              {formatPrice(grandTotal, currency)}
            </span>
          </div>
          <Button
            type="submit"
            className="min-h-12 w-full"
            size="lg"
            disabled={submitting}
          >
            {submitting ? "Placing Order..." : "Place Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
