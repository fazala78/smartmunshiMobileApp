import { Contact } from './contact';
import { Currency } from './Currency';
import { Cart, ShippingDataType } from './Inventory';

export interface LotFilters {
  searchQuery: string;
  lotStatus: string;
  processes: any[];
  contacts: string[];
  isSubLot: boolean;
  isLedgerScreen?: boolean;
}

export interface FetchParams {
  page: number;
  limit: number;
  search: LotFilters;
}

export type ActionKey = 'nextStage' | 'stockify' | 'issueStock' | 'claim';

export interface Material {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  used: number;
}

export interface Consumption {
  quantity: number;
  cost: number;
  name: string;
}

export interface ProducedItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  purchase_id: number;
  next_manufacturer: string;
  unit: string;
  consumptions: Consumption[];
}
export interface finishedProducts {
  id: number;
  name: string;
  cost: number;
  quantity: number;
  purchase_id: number;
}

export interface Claims {
  display_name: string;
  quantity: number;
  cost: number;
}
export interface InventoryItem {
  parent_step: number | null;
  parent_id: number | null;
  id: number;
  lot_id: number;
  status: string;
  lot_number: string;
  process: string;
  account: string;
  provided_products?: Material[];
  produced_products?: ProducedItem[];
  finished_products?: finishedProducts[];
  claims?: Claims[];
}
export interface Processes {
  id: number;
  name: string;
}

export interface PaginatedResponse {
  data: InventoryItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export type SourceType = 'stock' | 'purchase';
export type ProcessId = 'cutting' | 'stitching' | 'washing' | 'packaging';

export interface Process {
  id: number;
  name: string;
}

export interface LotFormData {
  lot_number: string;
  source: SourceType;
  contact: Contact | null;
  consum_products?: ConsumeProduct[];
  cart: Cart[];
  quantity: string;
  process: Process | null;
  invoice_number: string;
  discount: number | null;
  date: Date | string;
  remarks: string;
  manufacturer: Contact | null;
  mixed_cart: Cart[];
  shipping: ShippingDataType;
  currency: Currency | null;
}
export interface ConsumeProduct {
  id: number;
  name: string;
  supplied_qty: number;
  quantity: number;
  cost: number;
  price: number;
  unit: string;
  used_qty: number;
  issue_id: number;
  totalConsumed?: number;
}

export type FormKey = keyof LotFormData;

export interface LotStatus {
  provided: number;
  consumed: number;
  claimed: number;
}
