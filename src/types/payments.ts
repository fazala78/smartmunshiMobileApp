import { Currency } from './Currency';

export interface PaymentPayload {
  // ── Required ──────────────────────────────────────────────────────────────
  contact: Contact | undefined;
  amount?: number;
  type: string;

  // ── Optional common ───────────────────────────────────────────────────────
  date?: Date; // ISO date e.g. "2026-03-01"
  remarks?: string;

  // ── Bank only (required when method === 'bank') ───────────────────────────
  account?: Account;
  slip_number?: string;

  // ── Cheque only (required when method === 'cheque') ───────────────────────
  cheque_number?: string;
  bank?: Bank;
  cheque_date?: Date | null;
  cheque?: Cheque;
  currency: Currency | null;
  expense: ExpenseAccount | undefined;
}

export interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  route: string;
  currency: Currency;
  balance: number;
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
