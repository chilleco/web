import { createAsyncThunk, createSlice, PayloadAction, type AnyAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@/shared/constants';
import { syncAuthCookie } from '@/shared/lib/auth';
import { initializeSession, resetSession, setAuthToken } from '@/features/session/stores/sessionSlice';
import { loginWithCredentialsApi, loginWithTelegramAppApi, loginWithSocialApi, logoutApi, type AuthUser, type CredentialsAuthRequest, type TelegramAppAuthRequest, type SocialAuthRequest } from '../api/authApi';

export interface AuthProfile {
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
    spaces?: number[] | null;
}

type AuthStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface AuthState {
    user: AuthProfile | null;
    status: AuthStatus;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    status: 'idle',
    error: null,
};

const persistAuthToken = (token: string | null) => {
    if (typeof window === 'undefined') return;
    if (token) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
    syncAuthCookie(token);
};

export const loginWithCredentials = createAsyncThunk<
    AuthUser,
    CredentialsAuthRequest,
    { rejectValue: string }
>(
    'auth/loginWithCredentials',
    async (payload, { dispatch, rejectWithValue }) => {
        try {
            const response = await loginWithCredentialsApi(payload);
            persistAuthToken(response.token);
            dispatch(setAuthToken(response.token));
            return response;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'auth_login_failed';
            return rejectWithValue(message);
        }
    }
);

export const loginWithTelegramApp = createAsyncThunk<
    AuthUser,
    TelegramAppAuthRequest,
    { rejectValue: string }
>(
    'auth/loginWithTelegramApp',
    async (payload, { dispatch, rejectWithValue }) => {
        try {
            const response = await loginWithTelegramAppApi(payload);
            persistAuthToken(response.token);
            dispatch(setAuthToken(response.token));
            return response;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'auth_tma_failed';
            return rejectWithValue(message);
        }
    }
);

export const loginWithSocial = createAsyncThunk<
    AuthUser,
    SocialAuthRequest,
    { rejectValue: string }
>(
    'auth/loginWithSocial',
    async (payload, { dispatch, rejectWithValue }) => {
        try {
            const response = await loginWithSocialApi(payload);
            persistAuthToken(response.token);
            dispatch(setAuthToken(response.token));
            return response;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'auth_social_failed';
            return rejectWithValue(message);
        }
    }
);

export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
    'auth/logout',
    async (_arg, { dispatch, rejectWithValue }) => {
        try {
            await logoutApi();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'auth_logout_failed';
            // Even if logout API fails, continue cleaning up locally
            persistAuthToken(null);
            dispatch(setAuthToken(null));
            dispatch(resetSession());
            dispatch(initializeSession() as unknown as AnyAction);
            return rejectWithValue(message);
        }

        persistAuthToken(null);
        dispatch(setAuthToken(null));
        dispatch(resetSession());
        dispatch(initializeSession() as unknown as AnyAction);
    }
);

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<AuthProfile | null>) => {
            state.user = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginWithCredentials.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(loginWithCredentials.fulfilled, (state, action) => {
                state.status = 'succeeded';
                const { token, ...profile } = action.payload;
                state.user = profile;
                state.error = null;
            })
            .addCase(loginWithCredentials.rejected, (state, action) => {
                state.status = 'failed';
                state.error = (typeof action.payload === 'string' ? action.payload : action.error.message) || 'unknown_error';
            })
            .addCase(loginWithTelegramApp.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(loginWithTelegramApp.fulfilled, (state, action) => {
                state.status = 'succeeded';
                const { token, ...profile } = action.payload;
                state.user = profile;
                state.error = null;
            })
            .addCase(loginWithTelegramApp.rejected, (state, action) => {
                state.status = 'failed';
                state.error = (typeof action.payload === 'string' ? action.payload : action.error.message) || 'unknown_error';
            })
            .addCase(loginWithSocial.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(loginWithSocial.fulfilled, (state, action) => {
                state.status = 'succeeded';
                const { token, ...profile } = action.payload;
                state.user = profile;
                state.error = null;
            })
            .addCase(loginWithSocial.rejected, (state, action) => {
                state.status = 'failed';
                state.error = (typeof action.payload === 'string' ? action.payload : action.error.message) || 'unknown_error';
            })
            .addCase(logout.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(logout.fulfilled, (state) => {
                state.status = 'succeeded';
                state.user = null;
                state.error = null;
            })
            .addCase(logout.rejected, (state, action) => {
                state.status = 'failed';
                state.user = null;
                state.error = (typeof action.payload === 'string' ? action.payload : action.error.message) || 'unknown_error';
            });
    },
});

export const { setUser, clearError } = authSlice.actions;

export const selectAuthUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => Boolean(state.auth.user && state.auth.user.id);
export const selectAuthStatus = (state: { auth: AuthState }) => state.auth.status;

export default authSlice.reducer;
