'use client';

import { useEffect, useRef } from 'react';
import { useToastActions } from '@/shared/hooks/useToast';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { loginWithTelegramApp, selectAuthUser } from '../stores/authSlice';

declare global {
    interface Window {
        Telegram?: {
            WebApp?: {
                initData?: string;
                initDataUnsafe?: {
                    user?: unknown;
                };
            };
        };
    }
}

export default function TelegramAuthInitializer() {
    const dispatch = useAppDispatch();
    const { error: showError } = useToastActions();
    const utm = useAppSelector((state) => state.session.utm);
    const user = useAppSelector(selectAuthUser);
    const hasAttempted = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (user || hasAttempted.current) return;

        const tma = window.Telegram?.WebApp;
        if (!tma?.initDataUnsafe?.user || !tma.initData) return;

        hasAttempted.current = true;
        dispatch(loginWithTelegramApp({ url: tma.initData, utm }))
            .unwrap()
            .catch((err) => {
                const message = err instanceof Error ? err.message : 'Telegram auth failed';
                showError(message);
            });
    }, [dispatch, user, utm, showError]);

    return null;
}
