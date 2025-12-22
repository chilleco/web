import { isTelegramMiniApp } from './telegram';
import { isVkMiniApp } from './vk';

export const getClientNetwork = (): 'web' | 'tg' | 'vk' => {
    if (isTelegramMiniApp()) {
        return 'tg';
    }

    if (isVkMiniApp()) {
        return 'vk';
    }

    return 'web';
};

export const isApp = () => getClientNetwork() !== 'web';
