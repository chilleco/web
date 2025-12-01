import { API_ENDPOINTS } from '@/shared/constants';
import { api } from '@/shared/services/api/client';
import type { User, LoginRequest, LoginResponse, RegisterRequest, UpdateProfileRequest } from '../model/user';

export async function loginUser(credentials: LoginRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/login/', credentials);
}

export async function registerUser(userData: RegisterRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/register/', userData);
}

export async function getCurrentUser(id: number): Promise<User> {
  return getUserById(id);
}

export async function updateUserProfile(data: UpdateProfileRequest): Promise<User> {
  const response = await api.post<{ user: User }>(API_ENDPOINTS.USERS.UPDATE, data);
  return response.user;
}

export async function logoutUser(): Promise<void> {
  return api.post('/auth/logout/');
}

export async function refreshToken(refreshToken: string): Promise<{ token: string }> {
  return api.post('/auth/refresh/', { refreshToken });
}

export async function getUserById(id: number): Promise<User> {
  const response = await api.post<{ users: User } | { users: User[] }>(API_ENDPOINTS.USERS.GET, { id });
  // API may return object or list; normalize to single user
  if ((response as { users: User }).users && !Array.isArray((response as { users: User }).users)) {
    return (response as { users: User }).users;
  }
  const users = (response as { users: User[] }).users;
  if (Array.isArray(users) && users.length) {
    return users[0];
  }
  throw new Error('User not found');
}
