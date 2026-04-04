import { Contact } from './contact';
import { Currency } from './Currency';

export interface PaymentPayload {
  // ── Required ──────────────────────────────────────────────────────────────
  contact: Contact | undefined;
  amount?: number;
  type: string;

  // ── Optional common ───────────────────────────────────────────────────────
  date?: Date | string; // ISO date e.g. "2026-03-01"
  remarks?: string;

  // ── Bank only (required when method === 'bank') ───────────────────────────
  account?: Account;
  slip_number?: string;

  // ── Cheque only (required when method === 'cheque') ───────────────────────
  cheque_number?: string;
  bank?: Bank;
  cheque_date?: Date | null | string;
  cheque?: Cheque;
  currency: Currency | null;
  expense: ExpenseAccount | undefined;
}

export interface Bank {}

export interface Account {
  id: number;
  name: string;
  code: string;
}

export interface Cheque {
  id: number;
  source_name: string;
  amount: number;
  cheque_number: string;
  name: string;
  status: string;
  clearing_date: '23-Mar-2026';
  date: '01-Mar-2026';
  currency: Currency;
  bank: string;
}
export interface ExpenseAccount {
  id: number;
  name: string;
  code: string;
  type_id: number;
  parent_id: number | null;
  initial_amount: number;
}

export interface PaymentListing {
  id: number;
  transaction_id: number;
  receipt_number: string;
  contact: string;
  amount: number;
  payment_method?: string;
  date: string;
  route: string;
  class: string;
}
