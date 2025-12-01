// User entity types and interfaces
export interface User {
  id: number;
  login?: string | null;
  name?: string | null;
  surname?: string | null;
  title?: string | null;
  phone?: string | number | null;
  mail?: string | null;
  email?: string | null;
  image?: string | null;
  created?: number;
  updated?: number;
  status?: number;
  balance?: number;
  premium?: boolean;
  mailing?: boolean;
  wallet?: string | null;
  locale?: string | null;
  roles?: number[] | null;
  utm?: string | null;
  referrer?: number | null;
  frens?: number[] | null;
  social?: number | null;
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
  login?: string | null;
  name?: string | null;
  surname?: string | null;
  phone?: string | number | null;
  mail?: string | null;
  image?: string | null;
  locale?: string | null;
  mailing?: boolean | null;
  wallet?: string | null;
}
