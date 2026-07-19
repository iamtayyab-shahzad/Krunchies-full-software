"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BillLine, OrderType, PaymentMethod, Product, ProductSize } from "@/types";
import { makeLineKey } from "@/lib/utils";

interface BillState {
  draftId: string | null;
  orderType: OrderType;
  customerName: string;
  phone: string;
  address: string;
  locationId: string;
  deliveryCharge: number;
  paymentMethod: PaymentMethod;
  orderNotes: string;
  items: BillLine[];
  search: string;
}

interface BillContextValue extends BillState {
  setSearch: (v: string) => void;
  setOrderType: (v: OrderType) => void;
  setCustomerName: (v: string) => void;
  setPhone: (v: string) => void;
  setAddress: (v: string) => void;
  setLocation: (id: string, charge: number) => void;
  setPaymentMethod: (v: PaymentMethod) => void;
  setOrderNotes: (v: string) => void;
  addProduct: (product: Product, size: ProductSize) => void;
  changeSize: (key: string, size: ProductSize) => void;
  increase: (key: string) => void;
  decrease: (key: string) => void;
  remove: (key: string) => void;
  setInstructions: (key: string, text: string) => void;
  loadDraft: (partial: Partial<BillState> & { items: BillLine[] }) => void;
  clearBill: () => void;
  subtotal: number;
}

const defaults: BillState = {
  draftId: null,
  orderType: "walkin",
  customerName: "Walk-in Customer",
  phone: "0000000000",
  address: "",
  locationId: "",
  deliveryCharge: 0,
  paymentMethod: "cash",
  orderNotes: "",
  items: [],
  search: "",
};

const BillContext = createContext<BillContextValue | null>(null);

export function BillProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BillState>(defaults);

  const addProduct = useCallback((product: Product, size: ProductSize) => {
    const key = makeLineKey(product.id, size.id);
    setState((prev) => {
      const existing = prev.items.find((i) => i.key === key);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.key === key ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        };
      }
      return {
        ...prev,
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
          },
        ],
      };
    });
  }, []);

  const value = useMemo<BillContextValue>(() => {
    const subtotal = state.items.reduce(
      (s, i) => s + i.price * i.quantity,
      0,
    );
    return {
      ...state,
      subtotal,
      setSearch: (search) => setState((p) => ({ ...p, search })),
      setOrderType: (orderType) => setState((p) => ({ ...p, orderType })),
      setCustomerName: (customerName) => setState((p) => ({ ...p, customerName })),
      setPhone: (phone) => setState((p) => ({ ...p, phone })),
      setAddress: (address) => setState((p) => ({ ...p, address })),
      setLocation: (locationId, deliveryCharge) =>
        setState((p) => ({ ...p, locationId, deliveryCharge })),
      setPaymentMethod: (paymentMethod) =>
        setState((p) => ({ ...p, paymentMethod })),
      setOrderNotes: (orderNotes) => setState((p) => ({ ...p, orderNotes })),
      addProduct,
      changeSize: (key, size) =>
        setState((p) => ({
          ...p,
          items: p.items.map((i) =>
            i.key === key
              ? {
                  ...i,
                  key: makeLineKey(i.product_id, size.id),
                  size_id: size.id,
                  size: size.size,
                  price: size.price,
                }
              : i,
          ),
        })),
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
          items: p.items.map((i) =>
            i.key === key ? { ...i, special_instructions: text } : i,
          ),
        })),
      loadDraft: (partial) =>
        setState((p) => ({
          ...p,
          ...partial,
        })),
      clearBill: () =>
        setState((p) => ({
          ...defaults,
          search: p.search,
          orderType: p.orderType,
        })),
    };
  }, [state, addProduct]);

  return <BillContext.Provider value={value}>{children}</BillContext.Provider>;
}

export function useBill() {
  const ctx = useContext(BillContext);
  if (!ctx) throw new Error("useBill must be used within BillProvider");
  return ctx;
}
