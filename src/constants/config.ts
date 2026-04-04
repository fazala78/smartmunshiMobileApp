// Your actual Laravel domain
const CENTRAL_DOMAIN = 'smartmunshi.com';

// For iOS Simulator testing
export const API_BASE_URL = `https://${CENTRAL_DOMAIN}/mob-app`;

// Function to get tenant-specific URL
export const getTenantApiUrl = (tenantKey: string): string => {
  return `https://${tenantKey}.${CENTRAL_DOMAIN}/mob-app`;
};

export const API_ENDPOINTS = {
  VERIFY_TENANT: '/verify-tenant',
  LOGIN: '/login',
} as const;
