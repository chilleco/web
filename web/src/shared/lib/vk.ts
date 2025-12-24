const VK_LAUNCH_PARAMS_KEY = 'vk-launch-params';

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
        return isValidVkLaunchParams(params) ? params : null;
    } catch {
        return null;
    }
};

export const getVkLaunchParams = () => {
    const params = getVkQueryParams();
    if (isValidVkLaunchParams(params)) {
        const filtered = filterVkLaunchParams(params);
        storeVkLaunchParams(filtered);
        return filtered;
    }

    return readStoredVkLaunchParams();
};

export const getVkLaunchQuery = () => {
    const params = getVkLaunchParams();
    if (!params) return null;

    const entries = Array.from(params.entries());
    if (!entries.length) return null;
    return Object.fromEntries(entries);
};

export const isVkMiniApp = () => Boolean(getVkLaunchParams());
