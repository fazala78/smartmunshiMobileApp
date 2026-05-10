import api from './api';
import { getJson, setJson } from './storage';
import {
  ContactFilters,
  PaginatedResponse,
  Contact,
  City,
  FetchTransactionsParams,
  TransactionPaginatedResponse,
  ContactTransactionTypes,
  ContactForm,
  ContactCategory,
} from '../types/contact';
/**
 * Fetch contacts with filters and pagination
 * @param filters - Filter parameters for contacts
 * @returns Promise with paginated contacts data
 */
/**
 * Fetch contacts with filters and pagination
 * @param filters - Filter parameters for contacts
 * @returns Promise with paginated contacts data
 */
export const fetchContacts = async (
  filters: any = {},
): Promise<PaginatedResponse> => {
  try {
    const params: any = {
      page: filters.page || 1,
      limit: filters.limit || 10,
    };
    // Add search query
    if (filters.search && filters.search.searchQuery.trim()) {
      params.search = filters.search.searchQuery.trim();
    }

    // Add contact type filter
    if (filters.search?.contactType && filters.search.contactType !== 'all') {
      params.type = filters.search.contactType;
    }

    // Add city filter
    if (filters.search?.cities && filters.search.cities.length > 0) {
      params.cities = filters.search.cities;
    }

    // Add category filter
    if (filters.search?.category && filters.search.category.length > 0) {
      params.category = filters.search.category;
    }

    if (filters.search?.since) {
      params.since = filters.search?.since;
    }

    const response = await api.get('/contacts', { params });

    const responseData = response.data;

    // Handle Laravel pagination format
    if (responseData.data && responseData.meta.current_page !== undefined) {
      return {
        data: responseData.data,
        pagination: {
          currentPage: responseData.meta.current_page,
          totalPages: responseData.meta.last_page,
          totalItems: responseData.meta.total,
          itemsPerPage: responseData.meta.per_page,
          hasNextPage:
            responseData.meta.current_page < responseData.meta.last_page,
          hasPreviousPage: responseData.meta.current_page > 1,
        },
      };
    }

    // Handle direct array response
    if (Array.isArray(responseData)) {
      return {
        data: responseData,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: responseData.length,
          itemsPerPage: responseData.length,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Handle other structured responses
    return {
      data: responseData.data || responseData.contacts || [],
      pagination: responseData.pagination || {
        currentPage: responseData.page || 1,
        totalPages: responseData.totalPages || 1,
        totalItems: responseData.total || 0,
        itemsPerPage: responseData.limit || 10,
        hasNextPage: responseData.hasNextPage || false,
        hasPreviousPage: responseData.hasPreviousPage || false,
      },
    };
  } catch (error: any) {
    throw error;
  }
};

export const getAllContacts = async (
  filters: ContactFilters,
): Promise<PaginatedResponse> => {
  try {
    const params: any = {
      page: filters.page || 1,
      limit: filters.limit || 10,
    };
    // Add search query
    if (filters.search && filters.search.searchQuery.trim()) {
      params.search = filters.search.searchQuery.trim();
    }

    // Add contact type file
    if (filters.search?.contactType && filters.search.contactType !== 'all') {
      params.type = filters.search.contactType;
    }

    // Add city filter
    if (filters.search?.cities && filters.search.cities.length > 0) {
      params.cities = filters.search.cities;
    }

    // Add category filter
    if (filters.search?.category && filters.search.category.length > 0) {
      params.category = filters.search.category;
    }

    if (filters?.since) {
      params.since = filters?.since;
    }

    const response = await api.get('/all-contacts', { params });

    return response.data;
  } catch (error: any) {
    throw error;
  }
};

const CONTACTS_CACHE_KEY = 'contacts:all';

export const fetchAllContacts = async (
  filters: ContactFilters,
  pageSize = 30,
): Promise<Contact[]> => {
  const allContacts: Contact[] = [];
  let currentPage = 1;

  while (true) {
    const params: any = {
      ...filters,
      page: currentPage,
      limit: pageSize,
    };

    // Add since parameter for incremental sync

    const response = await getAllContacts(params);
    // Filter out items with status === false (if statu property exists)
    const activeContacts = response.data;
    allContacts.push(...activeContacts);

    if (response.current_page === response.last_page) {
      break;
    }

    currentPage += 1;
  }

  // Merge with existing cche if doing incremental sync, otherwise replace

  if (filters.since) {
    const cached = getCachedContacts();
    const mergedContacts = [...cached, ...allContacts];
    // Remove duplicates by id
    const uniqueContacts = Array.from(
      new Map(mergedContacts.map(c => [c.id, c])).values(),
    );
    // Remove contacts with status === false from cache
    const activeContacts = uniqueContacts.filter(
      (contact: Contact) => (contact as any).status !== false,
    );
    setJson(CONTACTS_CACHE_KEY, activeContacts);
    return activeContacts;
  } else {
    setJson(CONTACTS_CACHE_KEY, allContacts);
    return allContacts;
  }
};

export const getCachedContacts = (): Contact[] => {
  return getJson<Contact[]>(CONTACTS_CACHE_KEY) ?? [];
};
/**
 * Create a new contact
 * @param contactData - Contact data to create
 * @returns Promise with created contact
 */
export const createContact = async (payload: ContactForm): Promise<any> => {
  try {
    const response = await api.post('/contacts', payload);
    return response.data;
  } catch (error: any) {
    console.log('error');
    throw error;
  }
};

/**
 * Get single contact details by ID
 * @param contactId - Contact ID
 * @returns Promise with contact details
 */

export const getContactTransactions = async (
  contactId: number,
  params: FetchTransactionsParams,
): Promise<TransactionPaginatedResponse> => {
  const { page, search } = params;
  try {
    const queryParams: any = {
      page,
      per_page: 15, // Default to 15 transactions per page
    };

    // Add filters
    if (search?.fromDate) {
      queryParams.from_date = search.fromDate;
    }

    if (search?.toDate) {
      queryParams.to_date = search.toDate;
    }

    if (search?.type && search.type !== 'all') {
      queryParams.type = search.type;
    }

    const response = await api.get(`/contacts/${contactId}/transactions`, {
      params: queryParams,
    });

    // Transform Laravel pagination format to our custom format
    const laravelData = response.data;

    const transformedResponse: TransactionPaginatedResponse = {
      data: laravelData.data,
      pagination: {
        currentPage: laravelData.meta.current_page,
        totalPages: laravelData.meta.last_page,
        totalItems: laravelData.meta.total,
        itemsPerPage: laravelData.meta.per_page,
        hasNextPage: laravelData.meta.current_page < laravelData.meta.last_page,
        hasPreviousPage: laravelData.meta.current_page > 1,
      },
    };

    return transformedResponse;
  } catch (error: any) {
    console.error('❌ Error fetching contact details:', error);
    throw error;
  }
};

/**
 * Update an existing contact
 * @param contactId - Contact ID
 * @param contactData - Updated contact data
 * @returns Promise with updated contact
 */
export const updateContact = async (
  contactId: string,
  contactData: Partial<Contact>,
) => {
  try {
    console.log('✏️ Updating contact:', contactId, contactData);

    const response = await api.put(`/contacts/${contactId}`, contactData);

    return {
      success: true,
      contact: response.data.data || response.data,
      message: response.data.message || 'Contact updated successfully',
    };
  } catch (error: any) {
    console.error('❌ Error updating contact:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to update contact',
    };
  }
};

/**
 * Delete a contact
 * @param contactId - Contact ID
 * @returns Promise with deletion result
 */
export const deleteContact = async (contactId: string) => {
  try {
    console.log('🗑️ Deleting contact:', contactId);

    const response = await api.delete(`/contacts/${contactId}`);

    return {
      success: true,
      message: response.data.message || 'Contact deleted successfully',
    };
  } catch (error: any) {
    console.error('❌ Error deleting contact:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to delete contact',
    };
  }
};

/**
 * Bulk import contacts
 * @param contacts - Array of contacts to import
 * @returns Promise with import result
 */
export const bulkImportContacts = async (contacts: Partial<Contact>[]) => {
  try {
    const response = await api.post('/contacts/bulk-import', { contacts });

    return {
      success: true,
      imported: response.data.imported || 0,
      failed: response.data.failed || 0,
      message: response.data.message || 'Contacts imported successfully',
    };
  } catch (error: any) {
    console.error('❌ Error importing contacts:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to import contacts',
    };
  }
};

/**
 * Export contacts to CSV
 * @param filters - Filter parameters for export
 * @returns Promise with export data
 */
export const exportContacts = async (filters: ContactFilters = {}) => {
  try {
    const params: any = {};

    if (filters.search?.searchQuery?.trim()) {
      params.search = filters.search.searchQuery.trim();
    }
    if (filters.search?.contactType && filters.search.contactType !== 'all') {
      params.type = filters.search.contactType;
    }
    if (filters.search?.cities && filters.search.cities.length > 0) {
      params.cities = filters.search.cities;
    }
    if (filters.search?.category && filters.search.category.length > 0) {
      params.category = filters.search.category;
    }

    const response = await api.get('/contacts/export', {
      params,
      responseType: 'blob',
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to export contacts',
    };
  }
};

/**
 * Get contact statistics
 * @returns Promise with contact stats
 */
export const getContactStats = async () => {
  try {
    const response = await api.get('/contacts/stats');

    return {
      success: true,
      stats: response.data.data || response.data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to fetch statistics',
    };
  }
};

/**
 * Get contact types
 * @returns Promise with contact stats
 */
export const getContactTypes = async (): Promise<string[]> => {
  try {
    const response = await api.get<string[]>('/contact-types');
    return response.data;
  } catch (error: any) {
    throw (
      error.response?.data || { message: error.message || 'Failed to get user' }
    );
  }
};

/**
 * Get contact transaction types
 * @returns Promise with contact stats
 */

export const getContactTransactionTypes = async (): Promise<
  ContactTransactionTypes[]
> => {
  try {
    const response = await api.get<ContactTransactionTypes[]>(
      '/contact-transactions',
    );
    return response.data;
  } catch (error: any) {
    throw (
      error.response?.data || { message: error.message || 'Failed to get user' }
    );
  }
};

/**
 * Fetch contact cities
 * @param filters - Filter parameters for contacts
 * @returns Promise with paginated contacts data
 */
export const fetchCities = async (): Promise<City[]> => {
  try {
    const response = await api.get('/cities', {});
    return response.data.data;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Fetch contacts categories
 * @param filters - Filter parameters for contacts
 * @returns Promise with paginated contacts data
 */
export const fetchCategories = async (): Promise<ContactCategory[]> => {
  try {
    const response = await api.get('/search-contact-categories', {});
    return response.data.data;
  } catch (error: any) {
    throw error;
  }
};

export const getLedgerHtml = async (
  id: number,
  filters?: any,
): Promise<string> => {
  try {
    const response = await api.get(`/contact-ledger/${id}/html`, {
      params: filters,
      headers: { Accept: 'text/html' },
    });
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const createSyncContact = async (payload: any): Promise<any> => {
  try {
    const response = await api.post('/sync-contacts', payload);
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const getContactBallance = async (id: number): Promise<string> => {
  try {
    const response = await api.get(`/contact-balance/${id}`);
    return response.data;
  } catch (error: any) {
    throw error;
  }
};
