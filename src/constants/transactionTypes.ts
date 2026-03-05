export const TRANSACTION_TYPES = {
  INVOICE: 'invoice',
  PURCHASE: 'purchases',
  SALE_RETURN: 'sale-returns',
  PURCHASE_RETURN: 'purchase-returns',
} as const;

export type TransactionType =
  (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];
