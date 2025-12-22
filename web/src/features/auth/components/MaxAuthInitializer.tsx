'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useToastActions } from '@/shared/hooks/useToast';
import { useApiErrorMessage } from '@/shared/hooks/useApiErrorMessage';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { getMaxInitData, isMaxMiniApp } from '@/shared/lib/max';
import { loginWithMaxApp, selectAuthUser } from '../stores/authSlice';

export default function MaxAuthInitializer() {
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
        if (!isMaxMiniApp()) return;
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
            const initData = getMaxInitData();
            if (!initData) {
                scheduleRetry();
                return;
            }

            hasAttempted.current = true;
            inFlightRef.current = true;
            dispatch(loginWithMaxApp({ url: initData, utm }))
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
    }, [dispatch, formatApiErrorMessage, showError, tSystem, user, utm]);

    return null;
}
