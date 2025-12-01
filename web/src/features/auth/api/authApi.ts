import { apiWithoutGlobalErrors } from '@/shared/services/api/client';
import { API_ENDPOINTS } from '@/shared/constants';

export interface CredentialsAuthRequest {
    login: string;
    password: string;
    utm?: string | null;
}

export interface AuthUser {
    id: number;
    login: string | null;
    name?: string | null;
    surname?: string | null;
    title?: string | null;
    phone?: string | number | null;
    mail?: string | null;
    image?: string | null;
    status?: number;
    new?: boolean;
    token: string;
}

export async function loginWithCredentialsApi(data: CredentialsAuthRequest): Promise<AuthUser> {
    return apiWithoutGlobalErrors.post<AuthUser>(API_ENDPOINTS.USERS.AUTH, data);
}

export async function logoutApi(): Promise<void> {
    await apiWithoutGlobalErrors.post(API_ENDPOINTS.USERS.EXIT);
}

export interface TelegramAppAuthRequest {
    url: string;
    utm?: string | null;
}

export async function loginWithTelegramAppApi(data: TelegramAppAuthRequest): Promise<AuthUser> {
    return apiWithoutGlobalErrors.post<AuthUser>(API_ENDPOINTS.USERS.APP_TG, data);
}

export interface SocialAuthRequest {
    social: string | number;
    code: string;
    utm?: string | null;
}

export async function loginWithSocialApi(data: SocialAuthRequest): Promise<AuthUser> {
    return apiWithoutGlobalErrors.post<AuthUser>(API_ENDPOINTS.USERS.SOCIAL, data);
}
