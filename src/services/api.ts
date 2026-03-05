import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTenantApiUrl, API_BASE_URL } from '../constants/config';

const api = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Track refresh state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any = null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Endpoints that should NOT include Branch ID
const excludeBranchIdEndpoints = [
  '/login',
  '/logout',
  '/refresh',
  '/verify-otp',
  '/verify-tenant',
];

// Helper function to check if endpoint should exclude branch ID
const shouldExcludeBranchId = (url: string | undefined): boolean => {
  if (!url) return false;
  return excludeBranchIdEndpoints.some(endpoint => url.includes(endpoint));
};

// Request interceptor
api.interceptors.request.use(
  async config => {
    const tenantKey = await AsyncStorage.getItem('tenantKey');
    const token = await AsyncStorage.getItem('authToken');

    // For tenant verification, use central domain
    if (config.url?.includes('/verify-tenant')) {
      config.baseURL = API_BASE_URL;
    }
    // For other requests, use tenant subdomain if tenant exists
    else if (tenantKey) {
      config.baseURL = getTenantApiUrl(tenantKey);
    } else {
      config.baseURL = API_BASE_URL;
    }

    // Add auth token if exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add Branch ID header for all requests EXCEPT login and other auth endpoints
    if (!shouldExcludeBranchId(config.url)) {
      try {
        const cachedBranch = await AsyncStorage.getItem('selectedBranch');

        if (cachedBranch) {
          const branchData = JSON.parse(cachedBranch);

          // Add branch ID to headers
          if (branchData.id) {
            config.headers['X-Branch-Id'] = branchData.id;
            console.log('🏪 Branch ID:', branchData.id);
          } else {
            console.warn('⚠️ Branch data exists but no ID found');
          }
        } else {
          console.log('ℹ️ No branch selected - skipping Branch ID header');
        }
      } catch (error) {
        console.error('❌ Error retrieving branch data:', error);
      }
    } else {
      console.log('🚫 Excluding Branch ID for:', config.url);
    }

    console.log('📍 Full URL:', config.baseURL + config.url);
    console.log('📝 Method:', config.method?.toUpperCase());
    console.log('📋 Headers:', JSON.stringify(config.headers, null, 2));
    console.log('📤 Request Data:', JSON.stringify(config.data, null, 2));
    console.log('=== API REQUEST END ===\n');

    return config;
  },
  error => {
    console.error('❌ Request Interceptor Error:', error);
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  response => {
    console.log('✅ === API RESPONSE SUCCESS ===');
    console.log('📍 URL:', response.config.url);
    console.log('📊 Status:', response.status);
    console.log('📥 Datalll:', JSON.stringify(response.data, null, 2));
    console.log('=== RESPONSE END ===\n');
    return response;
  },
  async error => {
    const originalRequest = error.config;

    console.error('❌ === API RESPONSE ERROR ===');
    console.error('📍 URL:', error.config?.url);
    console.error('📍 Base URL:', error.config?.baseURL);

    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error(
        '📥 Error Data:',
        JSON.stringify(error.response.data, null, 2),
      );

      // Handle 401 Unauthorized - Token Refresh Logic
      if (error.response.status === 401 && !originalRequest._retry) {
        // Skip refresh for login/refresh endpoints
        if (
          originalRequest.url?.includes('/login') ||
          originalRequest.url?.includes('/refresh')
        ) {
          console.log('🔐 Login/Refresh endpoint - skipping token refresh');
          await AsyncStorage.removeItem('authToken');
          return Promise.reject(error);
        }

        if (isRefreshing) {
          // Queue the request while token is being refreshed
          console.log('⏳ Queueing request while refreshing...');
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch(err => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Call your refresh token function
          const response = await api.post('/refresh');
          const { accessToken, refreshToken } = response.data;
          // Save new tokens
          await AsyncStorage.setItem('authToken', accessToken);
          if (refreshToken) {
            await AsyncStorage.setItem('refreshToken', refreshToken);
          }
          // Update default authorization header
          api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          // Process queued requests
          processQueue(null, accessToken);
          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError: any) {
          // Process queue with error
          processQueue(refreshError, null);
          // Clear tokens and branch data
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('refreshToken');
          await AsyncStorage.removeItem('selectedBranch');
          // You can emit an event here to navigate to login
          // EventEmitter.emit('LOGOUT');
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
      // Handle other 401 cases (already retried)
      else if (error.response.status === 401) {
        console.log('🔐 Unauthorized after retry - Removing tokens');
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('selectedBranch');
      }
    } else if (error.request) {
      console.error('📡 No Response Received');
      console.error('🌐 Network Error or Server Down');
    } else {
      console.error('⚠️ Error:', error.message);
    }

    console.error(error, '=== ERROR END ===\ndddd');
    console.log(error);
    return Promise.reject(error);
  },
);

export default api;
