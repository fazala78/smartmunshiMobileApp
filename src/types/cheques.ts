import { Currency } from './Currency';

export interface chequeQueryParams {
  searchQuery: string;
  contacts: string[];
  accounts: string[];
  status: string;
  clearing_date?: string | undefined;
  date?: string | undefined;
}

export interface Cheque {
  id: number;
  source_name: string;
  amount: number;
  cheque_number: string;
  status: ChequeStatus;
  clearing_date: string;
  date: string;
  currency: Currency;
  /** Present for partial / installment cheques — remaining unpaid amount. */
  balance?: number;
  /** Present for partial / installment cheques — each entry is one installment. */
  transactions?: InstallmentTransaction[];
}

export interface InstallmentTransaction {
  id: number;
  amount: number;
  date: string;
  debit_amount: number;
  credit_amount: number;
}

export interface InstallmentData {
  id: number;
  source_name: string;
  amount: number;
  cheque_number: string;
  status: string;
  clearing_date: string;
  date: string;
  balance: number;
  currency: { symbol: string };
  transactions: InstallmentTransaction[];
}
export interface ChequeStatusSummary {
  total_amount: string;
  quantity: number;
}

export type ChequeStatus =
  | 'unsettled'
  | 'partial'
  | 'installment'
  | 'issued'
  | 'clearing'
  | 'handed_over';
