// User entity types and interfaces
export interface User {
  id: number;
  login: string;
  name?: string;
  surname?: string;
  title?: string;
  email?: string;
  image?: string;
  created?: number;
  updated?: number;
  status?: number;
}

export interface UserSettings {
  language: string;
  theme: 'light' | 'dark' | 'system';
  isInitialized: boolean;
}

export interface AuthUser extends User {
  token?: string;
  refreshToken?: string;
}

// User API request/response types
export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  refreshToken?: string;
}

export interface RegisterRequest {
  login: string;
  email: string;
  password: string;
  name?: string;
  surname?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  surname?: string;
  email?: string;
  image?: string;
}