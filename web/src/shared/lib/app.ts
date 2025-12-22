import { isTelegramMiniApp } from './telegram';
import { isVkMiniApp } from './vk';
import { isMaxMiniApp } from './max';

export const getClientNetwork = (): 'web' | 'tg' | 'vk' | 'max' => {
    if (isTelegramMiniApp()) {
        return 'tg';
    }

    if (isVkMiniApp()) {
        return 'vk';
    }

    if (isMaxMiniApp()) {
        return 'max';
    }

    return 'web';
};

export const isApp = () => getClientNetwork() !== 'web';
