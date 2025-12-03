import { API_ENDPOINTS } from '@/shared/constants';
import { apiWithoutGlobalErrors } from '@/shared/services/api/client';

export interface CreateSessionTokenPayload {
    token: string;
    network: string;
    utm?: string | null;
    extra?: Record<string, unknown>;
}

export interface CreateSessionTokenResponse {
    token: string;
}

export async function createSessionToken(payload: CreateSessionTokenPayload): Promise<CreateSessionTokenResponse> {
    return apiWithoutGlobalErrors.post<CreateSessionTokenResponse>(API_ENDPOINTS.USERS.TOKEN, payload, { skipAuthInit: true });
}
