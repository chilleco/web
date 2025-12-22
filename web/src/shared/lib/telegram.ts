type TelegramWebApp = {
    initData?: string;
    initDataUnsafe?: {
        user?: unknown;
    };
};

const getTelegramWebApp = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    const telegram = (window as typeof window & { Telegram?: { WebApp?: TelegramWebApp } }).Telegram;
    return telegram?.WebApp ?? null;
};

export const isTelegramMiniApp = () => {
    const tma = getTelegramWebApp();
    if (!tma) return false;

    if (typeof tma.initData === 'string' && tma.initData.trim().length > 0) {
        return true;
    }

    return Boolean(tma.initDataUnsafe?.user);
};

export const getClientNetwork = (): 'web' | 'tg' => (isTelegramMiniApp() ? 'tg' : 'web');
