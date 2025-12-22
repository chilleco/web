'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useToastActions } from '@/shared/hooks/useToast';
import { useApiErrorMessage } from '@/shared/hooks/useApiErrorMessage';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { isVkMiniApp } from '@/shared/lib/vk';
import { loginWithVkApp, selectAuthUser } from '../stores/authSlice';

export default function VkAuthInitializer() {
    const dispatch = useAppDispatch();
    const { error: showError } = useToastActions();
    const tSystem = useTranslations('system');
    const formatApiErrorMessage = useApiErrorMessage();
    const utm = useAppSelector((state) => state.session.utm);
    const user = useAppSelector(selectAuthUser);
    const hasAttempted = useRef(false);
    const inFlightRef = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!isVkMiniApp()) return;
        if (user || hasAttempted.current || inFlightRef.current) return;

        const url = window.location.href;
        if (!url) return;

        hasAttempted.current = true;
        inFlightRef.current = true;
        dispatch(loginWithVkApp({ url, utm }))
            .unwrap()
            .catch((err) => {
                showError(formatApiErrorMessage(err, tSystem('server_error')));
            })
            .finally(() => {
                inFlightRef.current = false;
            });
    }, [dispatch, formatApiErrorMessage, showError, tSystem, utm, user]);

    return null;
}
