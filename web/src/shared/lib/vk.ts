const VK_LAUNCH_PARAMS_KEY = 'vk-launch-params';

const shouldLogVk = () => {
    if (typeof window === 'undefined') return false;
    const params = getVkQueryParams();
    if (params?.has('vk_debug') || params?.has('vk_user_id') || params?.has('sign')) {
        return true;
    }
    try {
        return Boolean(sessionStorage.getItem(VK_LAUNCH_PARAMS_KEY));
    } catch {
        return false;
    }
};

const logVk = (message: string, details?: Record<string, unknown>) => {
    if (!shouldLogVk()) return;
    console.info(`[vk] ${message}`, details ?? {});
};

const getVkQueryParams = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    const search = window.location?.search;
    if (!search) {
        return null;
    }

    return new URLSearchParams(search);
};

const isValidVkLaunchParams = (params: URLSearchParams | null): params is URLSearchParams => {
    if (!params) return false;
    return params.has('vk_user_id') && params.has('sign');
};

const filterVkLaunchParams = (params: URLSearchParams) => {
    const filtered = new URLSearchParams();
    params.forEach((value, key) => {
        if (key.startsWith('vk_') || key === 'sign') {
            filtered.append(key, value);
        }
    });
    return filtered;
};

const storeVkLaunchParams = (params: URLSearchParams) => {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(VK_LAUNCH_PARAMS_KEY, params.toString());
        logVk('stored launch params', {
            keys: Array.from(params.keys()),
            pathname: window.location.pathname,
        });
    } catch {
        // Ignore storage failures (private mode or disabled storage).
    }
};

const readStoredVkLaunchParams = () => {
    if (typeof window === 'undefined') return null;
    try {
        const stored = sessionStorage.getItem(VK_LAUNCH_PARAMS_KEY);
        if (!stored) return null;
        const params = new URLSearchParams(stored);
        if (!isValidVkLaunchParams(params)) {
            return null;
        }
        logVk('read launch params from session', {
            keys: Array.from(params.keys()),
            pathname: window.location.pathname,
        });
        return params;
    } catch {
        return null;
    }
};

export const getVkLaunchParams = () => {
    const params = getVkQueryParams();
    if (isValidVkLaunchParams(params)) {
        const filtered = filterVkLaunchParams(params);
        storeVkLaunchParams(filtered);
        logVk('launch params from url', {
            keys: Array.from(filtered.keys()),
            pathname: window.location.pathname,
        });
        return filtered;
    }

    const stored = readStoredVkLaunchParams();
    if (!stored) {
        logVk('launch params missing', {
            pathname: typeof window !== 'undefined' ? window.location.pathname : '',
        });
    }
    return stored;
};

export const getVkLaunchQuery = () => {
    const params = getVkLaunchParams();
    if (!params) return null;

    const entries = Array.from(params.entries());
    if (!entries.length) return null;
    return Object.fromEntries(entries);
};

export const isVkMiniApp = () => Boolean(getVkLaunchParams());
