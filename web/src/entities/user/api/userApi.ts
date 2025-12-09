import { API_ENDPOINTS } from '@/shared/constants';
import { api } from '@/shared/services/api/client';
import type { User, LoginRequest, LoginResponse, RegisterRequest, SaveUserRequest } from '../model/user';

export async function loginUser(credentials: LoginRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/login/', credentials);
}

export async function registerUser(userData: RegisterRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/register/', userData);
}

export async function getCurrentUser(id: number): Promise<User> {
  return getUserById(id);
}

export interface GetUsersParams {
  id?: number | number[] | null;
  limit?: number;
  offset?: number;
  fields?: string[];
}

export async function getUsers(params: GetUsersParams = {}): Promise<User[]> {
  const response = await api.post<{ users: User | User[] }>(API_ENDPOINTS.USERS.GET, params);
  const { users } = response;
  if (Array.isArray(users)) {
    return users;
  }
  return users ? [users] : [];
}

export async function updateUserProfile(data: SaveUserRequest): Promise<User> {
  return saveUser(data);
}

export async function logoutUser(): Promise<void> {
  return api.post('/auth/logout/');
}

export async function refreshToken(refreshToken: string): Promise<{ token: string }> {
  return api.post('/auth/refresh/', { refreshToken });
}

export async function getUserById(id: number): Promise<User> {
  const users = await getUsers({ id });
  if (Array.isArray(users) && users.length) {
    return users[0];
  }
  throw new Error('User not found');
}

export async function saveUser(data: SaveUserRequest): Promise<User> {
  const response = await api.post<{ user: User }>(API_ENDPOINTS.USERS.SAVE, data);
  return response.user;
}
