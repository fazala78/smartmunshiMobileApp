export interface CashEntry {
  id: number;
  transaction_id: number;
  transaction: string;
  particulars: string;
  debit: number | null;
  credit: number | null;
  date: string;
  description: string | null;
  route?: string | null;
}

export interface CashReportResponse {
  date: string;
  opening_balance: number;
  cash_in: CashEntry[];
  cash_out: CashEntry[];
  total_cash_in: number;
  total_cash_out: number;
  net_cash: number;
  closing_balance: number;
}

export interface CashSummaryItem {
  type: string;
  label: string;
  amount: number;
  count: number;
}

export interface CashSummaryResponse {
  debit_by_type: CashSummaryItem[];
  credit_by_type: CashSummaryItem[];
}
