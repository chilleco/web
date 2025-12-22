'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useToastActions } from '@/shared/hooks/useToast';
import { useApiErrorMessage } from '@/shared/hooks/useApiErrorMessage';
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
    const tSystem = useTranslations('system');
    const formatApiErrorMessage = useApiErrorMessage();
    const utm = useAppSelector((state) => state.session.utm);
    const user = useAppSelector(selectAuthUser);
    const hasAttempted = useRef(false);
    const inFlightRef = useRef(false);
    const attemptsRef = useRef(0);
    const retryTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (user || hasAttempted.current || inFlightRef.current) return;

        attemptsRef.current = 0;
        const maxAttempts = 12;
        const retryDelayMs = 250;

        const scheduleRetry = () => {
            if (attemptsRef.current >= maxAttempts) return;
            attemptsRef.current += 1;
            retryTimerRef.current = window.setTimeout(attemptAuth, retryDelayMs);
        };

        const attemptAuth = () => {
            const tma = window.Telegram?.WebApp;
            const initData = tma?.initData;
            if (!initData) {
                scheduleRetry();
                return;
            }

            hasAttempted.current = true;
            inFlightRef.current = true;
            dispatch(loginWithTelegramApp({ url: initData, utm }))
                .unwrap()
                .catch((err) => {
                    showError(formatApiErrorMessage(err, tSystem('server_error')));
                })
                .finally(() => {
                    inFlightRef.current = false;
                });
        };

        attemptAuth();

        return () => {
            if (retryTimerRef.current) {
                window.clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
        };
    }, [dispatch, user, utm, showError, formatApiErrorMessage, tSystem]);

    return null;
}
