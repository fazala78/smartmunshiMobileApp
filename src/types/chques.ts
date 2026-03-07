export interface chequeQueryParams {
  searchQuery: string;
  contacts: string[];
  accounts: string[];
  status: string;
  clearing_date?: string | undefined;
  date?: string | undefined;
}
