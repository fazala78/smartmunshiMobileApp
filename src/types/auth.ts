export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface UserResponse {
  success: boolean;
  user: User;
}
