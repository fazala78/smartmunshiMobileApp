export interface ProductFormData {
  product_type: string;
  discount_type: string;
  name: string;
  opening_stock: number | null;
  opening_bags: number | null;
  price: number | null;
  cost: number | null;
  min_price: number | null;
  sale_taxes: taxType[];
  purchase_taxes: taxType[];
  discount: number | null;
  barcode: string;
  qty_alert: number | null;
  unit: unitsType | null;
  remarks: string | null;
  asset_id: number | null;
  categories: CategoriesType[] | null;
  packets?: PacketsType[] | undefined;
  batches?: BatchType[] | undefined;
  lots?: LotType[] | undefined;
  sunits?: SunitsType[] | undefined;
  colors?: ColorType[] | undefined;
  locations?: LocationType[] | undefined;
}
export interface taxType {
  id: number;
  name: String;
  tax_rate: number;
  tax_type: string;
  pivot?: TaxPivotType;
}
export interface unitsType {
  id: number;
  name: String;
  symbol: String;
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
export interface SunitsType {
  id: number;
  name: string;
  size: number;
  hasError?: boolean;
  quantity?: number | null;
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
export interface TaxPivotType {
  product_id: number;
  account_id: number;
}
export interface CategoryPivotType {
  product_id: number;
  category_id: number;
}
export interface Location {
  name: string;
}
