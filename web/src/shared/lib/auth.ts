type JwtPayload = {
    user?: number;
    status?: number;
};

const AUTH_COOKIE_KEY = 'authToken';

const normalizeBase64 = (value: string) => {
    let output = value.replace(/-/g, '+').replace(/_/g, '/');
    const pad = output.length % 4;
    if (pad) {
        output += '='.repeat(4 - pad);
    }
    return output;
};

const parseJwtPayload = (token: string): JwtPayload | null => {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
        const decoded = atob(normalizeBase64(parts[1]));
        return JSON.parse(decoded) as JwtPayload;
    } catch {
        return null;
    }
};

const isAuthenticatedPayload = (payload: JwtPayload | null) => {
    if (!payload) return false;
    if (typeof payload.user === 'number') {
        return payload.user > 0;
    }
    if (typeof payload.status === 'number') {
        return payload.status >= 3;
    }
    return false;
};

export const syncAuthCookie = (token: string | null) => {
    if (typeof document === 'undefined') return;

    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
    const cookieBase = `path=/; SameSite=Lax${secure}`;

    if (!token) {
        document.cookie = `${AUTH_COOKIE_KEY}=; Max-Age=0; ${cookieBase}`;
        return;
    }

    const payload = parseJwtPayload(token);
    if (!isAuthenticatedPayload(payload)) {
        document.cookie = `${AUTH_COOKIE_KEY}=; Max-Age=0; ${cookieBase}`;
        return;
    }

    document.cookie = `${AUTH_COOKIE_KEY}=${encodeURIComponent(token)}; ${cookieBase}`;
};
