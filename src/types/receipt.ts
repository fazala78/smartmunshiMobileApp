export interface PaymentResource {
  id: number;
  title: string;
  time: string; // e.g. "03:45 PM"
  date: string; // e.g. "Jan,29 2026"
  total_amount: string;
  contact?: Contact | null;
  payment_methods: PaymentMethod[];
}

export interface Contact {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
}
export interface PaymentMethodDetails {
  cheque_number?: string | null;
  remarks: string | null;
  due_date?: string | null;
  status?: string | null;
  account?: string | null;
  slip?: string | null;
}

export interface PaymentMethod {
  id: number;
  label: string;
  amount: string;
  type: string;
  details: PaymentMethodDetails | null;
  icon: string;
}

export interface ExpenseSlip {
  id: number;
  title: string;
  date: string;
  time: string;
  remarks: string;
  icon: string;
  debit_account: string;
  credit_account: string;
  amount: string;
}

interface Currency {
  id: number;
  symbol: string;
  format: 'prefix' | 'suffix';
}

export interface JournalSlip {
  id: number;
  title: string;
  time: string; // e.g. "05:34 PM"
  date: string; // e.g. "Feb,17 2026"
  reference: string;
  debit_account: string;
  credit_account: string;
  amount: number;
  remarks: string;
  currency: Currency;
}

export interface BankReceipt {
  id: number;
  title: string;
  time: string; // e.g. "05:34 PM"
  date: string; // e.g. "Feb,17 2026"
  reference: string;
  debit_account: string;
  credit_account: string;
  amount: number;
  remarks: string;
  currency: Currency;
}
