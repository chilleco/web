type MaxWebApp = {
    initData?: string;
    initDataUnsafe?: {
        user?: unknown;
    };
};

const getMaxWebApp = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    const webApp = (window as typeof window & { WebApp?: MaxWebApp }).WebApp;
    return webApp ?? null;
};

export const getMaxInitData = () => {
    const webApp = getMaxWebApp();
    const initData = webApp?.initData;
    if (typeof initData !== 'string') {
        return null;
    }

    const trimmed = initData.trim();
    return trimmed.length > 0 ? trimmed : null;
};

export const isMaxMiniApp = () => {
    const webApp = getMaxWebApp();
    if (!webApp) return false;

    if (getMaxInitData()) {
        return true;
    }

    return Boolean(webApp.initDataUnsafe?.user);
};
