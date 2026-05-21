import { Currency } from '../types/contact';
import { Inventory } from '../types/Inventory';
import { StockTransferPayload } from '../types/stockTransfer';

export const createInventory = (currency: Currency): Inventory => ({
  contact: null,
  cart: [],
  invoice_amount: 0,
  mark_paid: false,
  discount: null,
  remarks: '',
  currency: currency,
  mixed_cart: [],
  payments: [],
  lot_number: '',
  stock_source: '',
  asset_id: null,
  option_id: null,
  // process: null,
  due_date: null,
  date: new Date(),

  shipping: {
    shipping_amount: null,
    shipper: null,
    shipping_ticket: '',
    remarks: '',
    asset_id: null,
    owner_pay_shipping: false,
  },

  summary: {
    total_qty: null,
    total_bags: null,
    total: 0,
    total_line_discount: 0,
    total_taxes: 0,
  },

  return_summary: {
    total_qty: null,
    total_bags: null,
    total: 0,
    total_line_discount: 0,
    total_taxes: 0,
  },

  invoice_number: '',
});

export const stockTransfer = (currency: Currency): StockTransferPayload => ({
  cart: [],
  date: new Date(),
  destination: null,
  currency: currency,
});
