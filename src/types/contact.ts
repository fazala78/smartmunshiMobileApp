export interface Contact {
  id: number;
  name: string;
  phone: string;
  balance: number;
  location?: string;
  category?: string;
  type?: string;
  avatar?: string;
  initials?: string;
  initialsColor?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  currency?: Currency;
}

export interface PaginatedResponse {
  data: Contact[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ContactFilters {
  search?: FilterState;
  page?: number;
  limit?: number;
}
export interface FilterState {
  searchQuery: string;
  contactType: string;
  cities: string[];
  category: string[];
}

export interface FilterChip {
  key: string;
  label: string;
}

export interface ContactCategory {
  id?: number;
  label: string;
}
export interface City {
  id: string;
  label: string;
}
export interface FetchTransactionsParams {
  page: number;
  search?: {
    fromDate?: string;
    toDate?: string;
    type?: string; // 'all' | 'sale' | 'payment' | 'return'
  };
}
export interface Bank {
  account_name: string;
}
export interface Lot {
  lot_number: string;
}
export interface Cheque {
  cheque_number: string;
  clearing_date: string;
}
export interface Transaction {
  id: number;
  transaction_id: number;
  description: string;
  route: string;
  transaction_type: string;
  date: string;
  debit: number;
  credit: number;
  balance?: number;
  cash: string | null;
  bank: Bank | null; // Will be calculated at runtime
  lot: Lot | null;
  cheque: Cheque | null;
}

export interface TransactionPaginatedResponse {
  data: Transaction[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface Currency {
  id: number;
  symbol: string;
  format: 'prefix' | 'suffix';
  default: boolean;
}

export interface ContactTransactionTypes {
  label: string;
  value: string;
}

export interface ContactForm {
  name: string;
  opn_balance: number | null;
  type: string;
  balance_type: string;
  phone: string;
  email: string;
  credit_limit: number | null;
  asset_id: null;
  city: ContactCity | null;
  category: ContactCategory | null;
  currency: null;
}
export interface ContactCategory {
  id?: number;
  number: string;
}

export interface ContactCity {
  id?: string;
  number: string;
}
