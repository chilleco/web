'use client';

import { useEffect, useRef } from 'react';
import { isVkMiniApp } from '@/shared/lib/vk';

declare global {
    interface Window {
        vkBridge?: {
            send?: (method: string, params?: Record<string, unknown>) => Promise<unknown> | void;
            supports?: (method: string) => boolean;
            supportsAsync?: (method: string) => Promise<boolean>;
        };
    }
}

export default function VkBridgeInitializer() {
    const hasInitialized = useRef(false);
    const inFlightRef = useRef(false);
    const attemptsRef = useRef(0);
    const retryTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!isVkMiniApp()) return;
        if (hasInitialized.current || inFlightRef.current) return;

        attemptsRef.current = 0;
        const maxAttempts = 12;
        const retryDelayMs = 250;

        const scheduleRetry = () => {
            if (attemptsRef.current >= maxAttempts) return;
            attemptsRef.current += 1;
            retryTimerRef.current = window.setTimeout(attemptInit, retryDelayMs);
        };

        const attemptInit = () => {
            const bridge = window.vkBridge;
            if (!bridge?.send) {
                scheduleRetry();
                return;
            }

            hasInitialized.current = true;
            inFlightRef.current = true;
            Promise.resolve(bridge.send('VKWebAppInit'))
                .catch(() => {
                    hasInitialized.current = false;
                    scheduleRetry();
                })
                .finally(() => {
                    inFlightRef.current = false;
                });
        };

        attemptInit();

        return () => {
            if (retryTimerRef.current) {
                window.clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
        };
    }, []);

    return null;
}
