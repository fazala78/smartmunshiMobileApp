import api from './api';
import type {
  LoginResponse,
  LogoutResponse,
  UserResponse,
} from '../types/auth';

export const login = async (
  email: string,
  password: string,
): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/login', {
      email,
      password,
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: error.message || 'Login failed' };
  }
};

export const logout = async (): Promise<LogoutResponse> => {
  try {
    const response = await api.post<LogoutResponse>('/logout');
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: error.message || 'Logout failed' };
  }
};

export const getCurrentUser = async (): Promise<UserResponse> => {
  try {
    const response = await api.get<UserResponse>('/me');
    return response.data;
  } catch (error: any) {
    throw (
      error.response?.data || { message: error.message || 'Failed to get user' }
    );
  }
};

export const refreshToken = async (): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/refresh');
    return response.data;
  } catch (error: any) {
    throw (
      error.response?.data || {
        message: error.message || 'Token refresh failed',
      }
    );
  }
};
