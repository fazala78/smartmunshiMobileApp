export interface Currency {
  id: number;
  symbol: string;
  format: 'prefix' | 'suffix';
  default: boolean;
}
