import { Currency } from './Currency';
import { DestinationBranch } from './stockTransfer';

export interface CashTransferPayload {
  amount: number | null;
  destination: DestinationBranch | null;
  date?: Date | string; // ISO date e.g. "2026-03-01"
  currency: Currency | null;
}
