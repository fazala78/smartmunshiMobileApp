export interface TenantVerificationRequest {
  tenant_key: string;
}

export interface TenantVerificationResponse {
  success: boolean;
  tenant: {
    id: string;
    name: string;
  };
}

export interface TenantError {
  message: string;
}
