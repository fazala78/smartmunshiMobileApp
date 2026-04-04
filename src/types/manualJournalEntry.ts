import { Currency } from './Currency';

export interface JournalEntry {
  id: number;
  reference: string;
  amount: string;
  remarks: string;
  debit_account: any | null;
  credit_account: any | null;
  currency: Currency | null;
  date: Date;
}

export interface EntryCardProps {
  entry: JournalEntry;
  index: number;
  total: number;
  onChange: (id: number, fields: Partial<JournalEntry>) => void;
  onDelete: (id: number) => void;
}
