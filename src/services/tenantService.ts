import api from './api';
import { API_ENDPOINTS } from '../constants/config';
import {
  TenantVerificationRequest,
  TenantVerificationResponse,
} from '../types/tenant';

export const verifyTenant = async (
  tenantKey: string,
): Promise<TenantVerificationResponse> => {
  try {
    const response = await api.post<TenantVerificationResponse>(
      API_ENDPOINTS.VERIFY_TENANT,
      { tenant_key: tenantKey } as TenantVerificationRequest,
    );
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};
