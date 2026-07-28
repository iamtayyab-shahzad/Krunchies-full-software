"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  BillLine,
  OrderType,
  PaymentMethod,
  PendingDraft,
  Product,
  ProductSize,
} from "@/types";
import {
  defaultPaymentForOrderType,
  makeLineKey,
  WALKIN_LOCATION_ID,
} from "@/lib/utils";
import { deleteDraft, getDraft, saveDraft } from "@/lib/offline-db";

const ACTIVE_DRAFT_ID = "active-cart";

interface BillState {
  draftId: string | null;
  editingOrderId: string | null;
  orderType: OrderType;
  customerName: string;
  phone: string;
  address: string;
  locationId: string;
  deliveryCharge: number;
  paymentMethod: PaymentMethod;
  orderNotes: string;
  tableNumber: string;
  items: BillLine[];
}

interface BillContextValue extends BillState {
  setOrderType: (v: OrderType) => void;
  setCustomerName: (v: string) => void;
  setPhone: (v: string) => void;
  setAddress: (v: string) => void;
  setLocation: (id: string, charge: number) => void;
  setPaymentMethod: (v: PaymentMethod) => void;
  setOrderNotes: (v: string) => void;
  setTableNumber: (v: string) => void;
  addProduct: (
    product: Product,
    size: ProductSize,
    opts?: { special_instructions?: string },
  ) => void;
  changeSize: (key: string, size: ProductSize) => void;
  increase: (key: string) => void;
  decrease: (key: string) => void;
  remove: (key: string) => void;
  setInstructions: (key: string, text: string) => void;
  setLineMeta: (
    key: string,
    meta: Partial<Pick<BillLine, "crust" | "toppings" | "extras" | "special_instructions">>,
  ) => void;
  loadDraft: (partial: Partial<BillState> & { items: BillLine[] }) => void;
  clearBill: () => void;
  subtotal: number;
  cartRecovered: boolean;
}

const defaults: BillState = {
  draftId: null,
  editingOrderId: null,
  orderType: "walkin",
  customerName: "Walk-in Customer",
  phone: "0000000000",
  address: "",
  locationId: WALKIN_LOCATION_ID,
  deliveryCharge: 0,
  paymentMethod: "cash",
  orderNotes: "",
  tableNumber: "",
  items: [],
};

const BillContext = createContext<BillContextValue | null>(null);

function toPendingDraft(state: BillState): PendingDraft {
  const now = new Date().toISOString();
  return {
    id: state.draftId || ACTIVE_DRAFT_ID,
    created_at: now,
    updated_at: now,
    order_type: state.orderType,
    customer_name: state.customerName,
    phone: state.phone,
    address: state.address,
    location_id: state.locationId,
    delivery_charge: state.deliveryCharge,
    payment_method: state.paymentMethod,
    order_notes: state.tableNumber
      ? [state.orderNotes, `TABLE:${state.tableNumber}`].filter(Boolean).join(" | ")
      : state.orderNotes,
    items: state.items,
  };
}

export function BillProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BillState>(defaults);
  const [cartRecovered, setCartRecovered] = useState(false);
  const hydrated = useRef(false);
  const skipPersist = useRef(true);

  // Restore cart draft on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const draft = await getDraft(ACTIVE_DRAFT_ID);
        if (cancelled) return;
        if (draft && draft.items?.length) {
          const tableMatch = draft.order_notes?.match(/TABLE:([^\s|]+)/i);
          const notes = (draft.order_notes || "")
            .replace(/(?:^|\|\s*)TABLE:[^\s|]+/gi, "")
            .replace(/\s*\|\s*/g, " | ")
            .replace(/^\s*\|\s*|\s*\|\s*$/g, "")
            .trim();
          setState({
            draftId: draft.id,
            editingOrderId: null,
            orderType: draft.order_type,
            customerName: draft.customer_name,
            phone: draft.phone,
            address: draft.address,
            locationId: draft.location_id,
            deliveryCharge: draft.delivery_charge,
            paymentMethod: draft.payment_method,
            orderNotes: notes,
            tableNumber: tableMatch?.[1] || "",
            items: draft.items,
          });
          setCartRecovered(true);
        } else {
          setState((p) => ({ ...p, draftId: ACTIVE_DRAFT_ID }));
        }
      } catch {
        setState((p) => ({ ...p, draftId: ACTIVE_DRAFT_ID }));
      } finally {
        hydrated.current = true;
        skipPersist.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave cart draft (debounced).
  useEffect(() => {
    if (!hydrated.current || skipPersist.current) return;
    if (state.editingOrderId) return; // don't overwrite active cart while editing pending
    const timer = setTimeout(() => {
      const draft = toPendingDraft({
        ...state,
        draftId: state.draftId || ACTIVE_DRAFT_ID,
      });
      if (!draft.items.length) {
        void deleteDraft(ACTIVE_DRAFT_ID);
        return;
      }
      void saveDraft(draft);
    }, 400);
    return () => clearTimeout(timer);
  }, [
    state.draftId,
    state.editingOrderId,
    state.orderType,
    state.customerName,
    state.phone,
    state.address,
    state.locationId,
    state.deliveryCharge,
    state.paymentMethod,
    state.orderNotes,
    state.tableNumber,
    state.items,
  ]);

  const addProduct = useCallback(
    (
      product: Product,
      size: ProductSize,
      opts?: { special_instructions?: string },
    ) => {
      const instructions = opts?.special_instructions?.trim() || undefined;
      const key = makeLineKey(product.id, size.id, instructions);
      setState((prev) => {
        const existing = prev.items.find((i) => i.key === key);
        if (existing) {
          return {
            ...prev,
            draftId: prev.draftId || ACTIVE_DRAFT_ID,
            items: prev.items.map((i) =>
              i.key === key ? { ...i, quantity: i.quantity + 1 } : i,
            ),
          };
        }
        return {
          ...prev,
          draftId: prev.draftId || ACTIVE_DRAFT_ID,
          items: [
            ...prev.items,
            {
              key,
              product_id: product.id,
              product_name: product.name,
              product_image: product.image,
              size_id: size.id,
              size: size.size,
              price: size.price,
              quantity: 1,
              special_instructions: instructions,
            },
          ],
        };
      });
    },
    [],
  );

  const value = useMemo<BillContextValue>(() => {
    const subtotal = state.items.reduce(
      (s, i) => s + i.price * i.quantity,
      0,
    );
    return {
      ...state,
      cartRecovered,
      subtotal,
      setOrderType: (orderType) =>
        setState((p) => {
          if (orderType === "walkin") {
            return {
              ...p,
              orderType,
              customerName: "Walk-in Customer",
              phone: "0000000000",
              address: "",
              locationId: WALKIN_LOCATION_ID,
              deliveryCharge: 0,
              paymentMethod: defaultPaymentForOrderType(orderType),
            };
          }
          return {
            ...p,
            orderType,
            customerName:
              p.customerName === "Walk-in Customer" ? "" : p.customerName,
            phone: p.phone === "0000000000" ? "" : p.phone,
            locationId:
              p.locationId === WALKIN_LOCATION_ID ? "" : p.locationId,
            deliveryCharge:
              p.locationId === WALKIN_LOCATION_ID ? 0 : p.deliveryCharge,
            paymentMethod: defaultPaymentForOrderType(orderType),
          };
        }),
      setCustomerName: (customerName) =>
        setState((p) => ({ ...p, customerName })),
      setPhone: (phone) => setState((p) => ({ ...p, phone })),
      setAddress: (address) => setState((p) => ({ ...p, address })),
      setLocation: (locationId, deliveryCharge) =>
        setState((p) => ({ ...p, locationId, deliveryCharge })),
      setPaymentMethod: (paymentMethod) =>
        setState((p) => ({ ...p, paymentMethod })),
      setOrderNotes: (orderNotes) => setState((p) => ({ ...p, orderNotes })),
      setTableNumber: (tableNumber) => setState((p) => ({ ...p, tableNumber })),
      addProduct,
      changeSize: (key, size) =>
        setState((p) => {
          const line = p.items.find((i) => i.key === key);
          if (!line) return p;
          const newKey = makeLineKey(
            line.product_id,
            size.id,
            line.special_instructions,
          );
          if (newKey === key) {
            return {
              ...p,
              items: p.items.map((i) =>
                i.key === key
                  ? {
                      ...i,
                      size_id: size.id,
                      size: size.size,
                      price: size.price,
                    }
                  : i,
              ),
            };
          }
          const existing = p.items.find((i) => i.key === newKey);
          if (existing) {
            return {
              ...p,
              items: p.items
                .filter((i) => i.key !== key)
                .map((i) =>
                  i.key === newKey
                    ? { ...i, quantity: i.quantity + line.quantity }
                    : i,
                ),
            };
          }
          return {
            ...p,
            items: p.items.map((i) =>
              i.key === key
                ? {
                    ...i,
                    key: newKey,
                    size_id: size.id,
                    size: size.size,
                    price: size.price,
                  }
                : i,
            ),
          };
        }),
      increase: (key) =>
        setState((p) => ({
          ...p,
          items: p.items.map((i) =>
            i.key === key ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        })),
      decrease: (key) =>
        setState((p) => ({
          ...p,
          items: p.items
            .map((i) =>
              i.key === key ? { ...i, quantity: i.quantity - 1 } : i,
            )
            .filter((i) => i.quantity > 0),
        })),
      remove: (key) =>
        setState((p) => ({
          ...p,
          items: p.items.filter((i) => i.key !== key),
        })),
      setInstructions: (key, text) =>
        setState((p) => ({
          ...p,
          items: p.items.map((i) => {
            if (i.key !== key) return i;
            const notes = text.trim() || undefined;
            return {
              ...i,
              key: makeLineKey(i.product_id, i.size_id, notes),
              special_instructions: notes,
            };
          }),
        })),
      setLineMeta: (key, meta) =>
        setState((p) => ({
          ...p,
          items: p.items.map((i) => {
            if (i.key !== key) return i;
            const next = { ...i, ...meta };
            if ("special_instructions" in meta) {
              const notes = next.special_instructions?.trim() || undefined;
              next.special_instructions = notes;
              next.key = makeLineKey(next.product_id, next.size_id, notes);
            }
            return next;
          }),
        })),
      loadDraft: (partial) =>
        setState((p) => ({
          ...p,
          ...partial,
        })),
      clearBill: () => {
        void deleteDraft(ACTIVE_DRAFT_ID);
        setCartRecovered(false);
        setState((p) => ({
          ...defaults,
          draftId: ACTIVE_DRAFT_ID,
          orderType: p.orderType,
        }));
      },
    };
  }, [state, addProduct, cartRecovered]);

  return <BillContext.Provider value={value}>{children}</BillContext.Provider>;
}

export function useBill() {
  const ctx = useContext(BillContext);
  if (!ctx) throw new Error("useBill must be used within BillProvider");
  return ctx;
}
