import { api } from '@/shared/services/api/client';
import type { User, LoginRequest, LoginResponse, RegisterRequest, UpdateProfileRequest } from '../model/user';

export async function loginUser(credentials: LoginRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/login/', credentials);
}

export async function registerUser(userData: RegisterRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/register/', userData);
}

export async function getCurrentUser(): Promise<User> {
  return api.get<User>('/users/me/');
}

export async function updateUserProfile(data: UpdateProfileRequest): Promise<User> {
  return api.put<User>('/users/me/', data);
}

export async function logoutUser(): Promise<void> {
  return api.post('/auth/logout/');
}

export async function refreshToken(refreshToken: string): Promise<{ token: string }> {
  return api.post('/auth/refresh/', { refreshToken });
}