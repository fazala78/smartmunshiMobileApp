export interface LotFilters {
  searchQuery: string;
  lotStatus: string;
  processes: any[];
  contacts: string[];
  isSubLot: boolean;
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
