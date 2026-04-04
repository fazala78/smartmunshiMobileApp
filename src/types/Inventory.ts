import { Contact } from './contact';
import { Currency } from './Currency';

export interface Inventory {
  contact: Contact | null;
  cart: Cart[];
  invoice_amount: number | null;
  invoice_number: string;
  discount: number | null;
  mark_paid: boolean;
  remarks: string;
  currency: Currency | null | undefined; // Replace `default_currency` with the appropriate type or provide a default value.
  summary: Summary; // Corrected the typo from `summary` to `summary`.
  mixed_cart: Cart[];
  return_summary: Summary;
  payments: Payment[];
  shipping: ShippingDataType;
  lot_number: string;
  stock_source: string;
  asset_id: number | null;
  option_id: number | null;
  //process: Process | null;
  due_date: Date | null;
  date: Date | string;
}

export interface Cart {
  display_price: string;
  display_quantity: string;
  id: number;
  name: string;
  price: number;
  barcode: null | string;
  min_price: number;
  qty_alert: null | number;
  asset_id: null | number;
  status: string;
  discount: null | number;
  subtotal?: number;
  quantity: number;
  bags?: number | null;
  quantity_meta?: Meta[];
  opening_bags?: number | null;
  categories?: CategoriesType[];
  packets?: PacketsType[];
  secondary_units?: SunitsType[];
  batches?: BatchType[];
  lots?: LotType[];
  sale_taxes?: taxType[];
  purchase_taxes?: taxType[];
  colors?: ColorType[];
  locations?: LocationType[] | undefined;
  discount_type: string;
  price_type: string;
  product_type: string;
  unit: string;
  cost: number;
  url?: string;
  adjustment: string;
  consum_products?: ConsumProducts[];
  featured: boolean;
  image_url: string;
}
export interface Summary {
  total_qty: number | null;
  total_bags: number | null;
  total: number;
  total_line_discount: number;
  total_taxes: number;
}
export type PaymentMethod = 'Cash' | 'Online' | 'Cheque' | 'Client Cheque';
export interface Payment {
  type: PaymentMethod;
  lable: string;
  amount: number | null;
  remarks: string;
  icon: string;
  currency: Currency | null | undefined;
  cheque_number?: string;
  cheque_date?: Date | null;
  bank?: Bank | null;
  asset_id?: number | null;
  slip_number?: string;
  account?: Account | null;
  cheque?: Cheque | null;
  color: string;
  bg: string;
}
export interface ShippingDataType {
  shipping_amount: number | null;
  shipper: Contact | null;
  shipping_ticket: string;
  remarks: string;
  asset_id: number | null;
  owner_pay_shipping: boolean;
}

export interface Meta {
  quantity: number;
  size: number;
}
export interface CategoriesType {
  id: number;
  name: string;
  asset_id: number | null;
  pivot?: CategoryPivotType;
}

export interface PacketsType {
  id?: number;
  name: string;
  label?: string;
  value?: string;
  opn_quantity?: number | null;
  size: number | null;
  type: 'packet';
  product_id?: number;
  quantity?: number;
  hasError?: boolean;
}
export interface SunitsType {
  id: number;
  name: string;
  size: number;
  hasError?: boolean;
  quantity?: number | null;
}
export interface BatchType {
  id?: number;
  name: string;
  mfg_date: Date | null;
  expiry_date: Date | null;
  opn_quantity?: number | null;
  quantity?: number | null;
  type: 'batch';
  hasError?: boolean;
  label?: string;
  value?: string;
}

export interface LotType {
  id?: number;
  name: string;
  opn_quantity?: number | null;
  quantity?: number | null;
  type: 'lot';
  hasError?: boolean;
  label?: string;
  value?: string;
}
export interface taxType {
  id: number;
  name: String;
  tax_rate: number;
  tax_type: string;
  pivot?: TaxPivotType;
}
export interface ColorType {
  id?: number;
  label?: string;
  value?: string;
  name: string;
  code: string;
  opn_quantity?: number | null;
  type: 'color';
  quantity?: number | null;
  hasError?: boolean;
}

export interface LocationType {
  id: number;
  name?: string;
  branch_id: number;
  quantity?: number | null;
  bags?: number | null;
  hasError?: boolean;
  location: Location;
}
export interface ConsumProducts {
  id: number;
  name: string;
  supplied_qty: number;
  quantity: number;
  cost: number;
  price?: number;
  unit: string;
  opening_bags: number;
  bags: number;
  used_qty: number;
  issue_id: number;
}

export interface Bank {
  id: number;
  name: string;
}

export interface Account {
  id: number;
  name: string;
  code: string;
}

export interface Cheque {
  id: number;
  cheque_number: string;
  status: string;
  clearing_date: string;
  date?: string;
  remarks?: string;
  source_name: string;
  amount: number;
  transactions?: ChequeTransication[];
  balance?: number;
  currency: Currency;
}
export interface CategoryPivotType {
  product_id: number;
  category_id: number;
}
export interface TaxPivotType {
  product_id: number;
  account_id: number;
}
export interface Location {
  name: string;
}
export interface ChequeTransication {
  id: number;
  amount: number;
  date: string;
  debit_amount: number;
  credit_amount: number;
}

export interface InventoryTransaction {
  transaction_id: number;
  invoice_number: string;
  contact: string;
  amount: number;
  payment_status?: 'paid' | 'unpaid' | 'partial';
  date: string;
  route: string;
  class: string;
  payments: TransactionPayment[];
  sale_return: TransactionSaleReturn;
}

export interface TransactionPayment {
  id: number;
  name: string;
  amount: number;
  payment_method: string;
  is_delete: boolean;
}

export interface TransactionSaleReturn {
  id: number;
  amount: string;
  is_delete: boolean;
}

export interface DeletePayload {
  payments: TransactionPayment[];
  sale_return: TransactionSaleReturn | null;
}
