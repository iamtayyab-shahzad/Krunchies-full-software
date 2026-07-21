export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Category extends BaseEntity {
  name: string;
  image: string;
  display_order: number;
  visible: boolean;
}

export interface ProductSize extends BaseEntity {
  product_id: string;
  size: string;
  price: number;
}

export interface Product extends BaseEntity {
  category_id: string;
  category?: Category;
  name: string;
  description: string;
  image: string;
  featured: boolean;
  available: boolean;
  display_order: number;
  sizes?: ProductSize[];
}

export interface Location extends BaseEntity {
  name: string;
  delivery_charge: number;
}

export interface Offer extends BaseEntity {
  title: string;
  description: string;
  image: string;
  active: boolean;
  start_date?: string | null;
  end_date?: string | null;
}

export interface InventoryItem extends BaseEntity {
  name: string;
  unit: string;
  stock: number;
  purchase_price: number;
  minimum_stock: number;
  inventory_transactions?: InventoryTransaction[];
}

export interface InventoryTransaction extends BaseEntity {
  inventory_id: string;
  quantity: number;
  transaction_type: string;
  reason: string;
}

export interface Recipe extends BaseEntity {
  product_id: string;
  inventory_id: string;
  quantity_required: number;
  product?: Product;
  inventory?: InventoryItem;
}

export interface OrderItem extends BaseEntity {
  order_id: string;
  product_id: string;
  product_size_id: string;
  quantity: number;
  price: number;
  special_instructions?: string;
  product?: Product;
  product_size?: ProductSize;
}

export interface Order extends BaseEntity {
  order_number: string;
  customer_id?: string;
  customer_name: string;
  phone: string;
  address: string;
  location_id: string;
  location?: Location;
  delivery_charge: number;
  cash_on_delivery_fee: number;
  payment_method: string;
  order_status: string;
  order_type: string;
  order_notes: string;
  subtotal: number;
  grand_total: number;
  items?: OrderItem[];
}

export interface Settings extends BaseEntity {
  restaurant_name: string;
  phone: string;
  whatsapp: string;
  logo: string;
  opening_time: string;
  closing_time: string;
  cash_on_delivery_fee: number;
  currency: string;
  google_maps: string;
  facebook: string;
  instagram: string;
}

export type PaymentMethod =
  | "cash"
  | "easypaisa"
  | "jazzcash"
  | "card"
  | "cod";

export type OrderType = "walkin" | "phone" | "website";

export type OrderStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export interface CreateOrderItemInput {
  product_id: string;
  product_size_id: string;
  quantity: number;
  special_instructions?: string;
}

export interface CreateOrderInput {
  customer_name: string;
  phone: string;
  address?: string;
  location_id: string;
  payment_method: string;
  order_notes?: string;
  items: CreateOrderItemInput[];
}

export interface BillLine {
  key: string;
  product_id: string;
  product_name: string;
  product_image: string;
  size_id: string;
  size: string;
  price: number;
  quantity: number;
  special_instructions?: string;
}

export interface PendingDraft {
  id: string;
  created_at: string;
  updated_at: string;
  order_type: OrderType;
  customer_name: string;
  phone: string;
  address: string;
  location_id: string;
  delivery_charge: number;
  payment_method: PaymentMethod;
  order_notes: string;
  items: BillLine[];
}

export interface OfflineAction {
  id: string;
  created_at: string;
  type:
    | "CREATE_ORDER"
    | "COMPLETE_ORDER"
    | "CANCEL_ORDER"
    | "UPDATE_PRODUCT"
    | "CREATE_PRODUCT"
    | "UPDATE_CATEGORY"
    | "CREATE_CATEGORY"
    | "UPDATE_INVENTORY"
    | "CREATE_INVENTORY"
    | "UPDATE_SETTINGS"
    | "CREATE_OFFER"
    | "UPDATE_OFFER";
  payload: unknown;
  synced: boolean;
  error?: string;
}

export interface StaffLoginInput {
  username: string;
  password: string;
}
