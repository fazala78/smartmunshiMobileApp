export interface BankInfo {
  id: number;
  name: string;
}

export interface BankAccount {
  id: number;
  name: string;
  code: string;
  balance: number;
  route: string;
  bank: BankInfo;
}

export interface LaravelPaginatedBanks {
  current_page: number;
  data: BankAccount[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface BankPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface BankAccountPaginatedResponse {
  data: BankAccount[];
  pagination: BankPagination;
}

export interface AccountTransaction {
  id: string;
  transaction_id: number;
  transaction_type: string;
  route: string;
  description: string | null;
  model: string;
  date: string;
  debit: number | null;
  credit: number | null;
  balance?: number;
  cash: string | null;
  bank: { account_name: string } | null;
  lot: { lot_number: string } | null;
  cheque: {
    cheque_number: string;
    clearing_date: string;
    action?: string;
    status: string;
  } | null;
  journal: { associated_account: string; remarks: string } | null;
}

export interface AccountTransactionPaginatedResponse {
  data: AccountTransaction[];
  pagination: BankPagination;
}

export interface CreateBankAccountPayload {
  name: string;
  code: string;
  bank_id: number;
  bank_branch_code: string;
  bank_code: string;
  opn_balance: number | null;
  balance_type: 'debit' | 'credit';
  currency: import('./contact').Currency | null;
}
