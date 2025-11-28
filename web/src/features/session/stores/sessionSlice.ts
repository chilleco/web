import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@/shared/constants';
import { createSessionToken } from '../api/sessionApi';

type SessionStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface SessionState {
    network: string;
    clientToken: string | null;
    authToken: string | null;
    utm: string | null;
    status: SessionStatus;
    error?: string | null;
}

const initialState: SessionState = {
    network: 'web',
    clientToken: null,
    authToken: null,
    utm: null,
    status: 'idle',
    error: null,
};

interface InitializeSessionArgs {
    utm?: string | null;
}

interface InitializeSessionResult {
    clientToken: string;
    authToken: string;
    utm: string | null;
}

const generateClientToken = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `session_${Math.random().toString(36).slice(2)}_${Date.now()}`;
};

export const initializeSession = createAsyncThunk<
    InitializeSessionResult,
    InitializeSessionArgs | undefined,
    { state: { session: SessionState } }
>(
    'session/initialize',
    async (args, { getState, rejectWithValue }) => {
        if (typeof window === 'undefined') {
            return rejectWithValue('client-only');
        }

        const { session } = getState();
        const utm = args?.utm ?? session.utm ?? null;

        const storedAuthToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const storedClientToken = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);

        const clientToken = session.clientToken || storedClientToken || generateClientToken();
        const network = session.network || 'web';

        // If we already have an auth token, just ensure client token is stored
        if (storedAuthToken) {
            if (!storedClientToken) {
                localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, clientToken);
            }
            return {
                clientToken,
                authToken: storedAuthToken,
                utm,
            };
        }

        localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, clientToken);

        try {
            const response = await createSessionToken({
                token: clientToken,
                network,
                utm: utm || undefined,
                extra: {
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    languages: navigator.languages,
                },
            });

            const authToken = response.token;
            localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authToken);

            return {
                clientToken,
                authToken,
                utm,
            };
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'session_init_failed');
        }
    }
);

export const sessionSlice = createSlice({
    name: 'session',
    initialState,
    reducers: {
        setNetwork: (state, action: PayloadAction<string>) => {
            state.network = action.payload;
        },
        setUtm: (state, action: PayloadAction<string | null>) => {
            state.utm = action.payload;
        },
        setAuthToken: (state, action: PayloadAction<string | null>) => {
            state.authToken = action.payload;
        },
        resetSession: (state) => {
            state.status = 'idle';
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(initializeSession.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(initializeSession.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.clientToken = action.payload.clientToken;
                state.authToken = action.payload.authToken;
                state.utm = action.payload.utm;
            })
            .addCase(initializeSession.rejected, (state, action) => {
                state.status = 'failed';
                state.error = (typeof action.payload === 'string' ? action.payload : action.error.message) || 'unknown_error';
            });
    },
});

export const { setNetwork, setUtm, setAuthToken, resetSession } = sessionSlice.actions;

export default sessionSlice.reducer;
