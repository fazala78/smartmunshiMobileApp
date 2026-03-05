// Currency type
export interface Currency {
  id: number;
  symbol: string;
  format: 'prefix' | 'suffix';
}

// Single transaction entry
export interface TransactionEntry {
  id: number;
  account: string;
  debit: number | null;
  credit: number | null;
  currency: Currency;
}

// A transaction group (array inside "transactions")
export type TransactionGroup = TransactionEntry[];

// Main transaction item
export interface TransactionItem {
  forEach(arg0: (entry: { debit: any; credit: any }) => void): unknown;
  key: string;
  tr_type: string;
  transaction_id: number;
  time: string; // e.g. "01:42 AM"
  route: string;
  transactions: TransactionGroup[];
}

// API response
export interface TransactionsResponse {
  data: TransactionItem[];
}

export interface queryParams {
  searchQuery: string;
  transactionTypes: string[];
  debitAccounts: string[];
  creditAccounts: string[];
  date?: string | undefined;
}
