"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CART_STORAGE_KEY } from "@/lib/constants";
import type { CartItem, Product, ProductSize } from "@/types";

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (
    product: Product,
    size: ProductSize,
    quantity?: number,
    specialInstructions?: string,
  ) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateInstructions: (id: string, instructions: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function makeCartItemId(productId: string, sizeId: string) {
  return `${productId}__${sizeId}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        const uuidRe =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        setItems(
          parsed.filter(
            (item) =>
              uuidRe.test(item.product_id || "") &&
              uuidRe.test(item.size_id || "") &&
              Number(item.quantity) > 0,
          ),
        );
      }
    } catch {
      setItems([]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback(
    (
      product: Product,
      size: ProductSize,
      quantity = 1,
      specialInstructions?: string,
    ) => {
      const id = makeCartItemId(product.id, size.id);
      setItems((prev) => {
        const existing = prev.find((item) => item.id === id);
        if (existing) {
          return prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  special_instructions:
                    specialInstructions ?? item.special_instructions,
                }
              : item,
          );
        }
        return [
          ...prev,
          {
            id,
            product_id: product.id,
            product_name: product.name,
            product_image: product.image,
            size_id: size.id,
            size: size.size,
            price: size.price,
            quantity,
            special_instructions: specialInstructions,
          },
        ];
      });
    },
    [],
  );

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, quantity) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const updateInstructions = useCallback((id: string, instructions: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, special_instructions: instructions }
          : item,
      ),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    return {
      items,
      itemCount,
      subtotal,
      addItem,
      updateQuantity,
      updateInstructions,
      removeItem,
      clearCart,
    };
  }, [
    items,
    addItem,
    updateQuantity,
    updateInstructions,
    removeItem,
    clearCart,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
