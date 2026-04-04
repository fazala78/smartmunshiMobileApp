import { colors } from '../theme';
import { Currency } from '../types/Currency';
import { Account, Bank, Cheque, PaymentMethod } from '../types/Inventory';

export const PAYMENT_TYPES = {
  RECEIVED: 'receive-payments',
  PAID: 'pay-payments',
} as const;

export type PaymentType = (typeof PAYMENT_TYPES)[keyof typeof PAYMENT_TYPES];

export const RECEIVE_PAYMENT: {
  type: string;
  lable: PaymentMethod;
  amount: number | null;
  remarks: string;
  icon: string;
  currency: Currency | null | undefined;
  cheque_number?: string;
  cheque_date?: Date | null;
  bank?: Bank | null;
  asset_id?: number | null;
  slip_number?: string;
  account?: Account | null;
  cheque?: Cheque | null;
  color: string;
  bg: string;
}[] = [
  {
    type: 'cash',
    lable: 'Cash',
    amount: null,
    remarks: '',
    icon: 'payments',
    currency: null,
    color: colors.primary,
    bg: '#f0fdf4',
  },
  {
    type: 'cheque',
    lable: 'Cheque',
    cheque_number: '',
    cheque_date: null,
    bank: null,
    amount: null,
    remarks: '',
    icon: 'credit-card',
    currency: null,
    asset_id: null,
    color: '#d97706',
    bg: '#fffbeb',
  },
  {
    type: 'online',
    lable: 'Online',
    slip_number: '',
    remarks: '',
    account: null,
    amount: null,
    icon: 'description',
    currency: null,
    color: '#2563eb',
    bg: '#eff6ff',
  },
];
