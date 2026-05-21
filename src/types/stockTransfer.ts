import { Currency } from './Currency';
import { Cart } from './Inventory';

export interface DestinationBranch {
  id: number;
  name: string;
}

export interface StockTransferPayload {
  cart: Cart[];
  date: Date | string;
  destination: DestinationBranch | null; // Branch ID
  currency: Currency;
}
