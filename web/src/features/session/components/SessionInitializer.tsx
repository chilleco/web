'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToastActions } from '@/shared/hooks/useToast';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { STORAGE_KEYS } from '@/shared/constants';
import { syncAuthCookie } from '@/shared/lib/auth';
import { getClientNetwork } from '@/shared/lib/app';
import { getUtmFromSearchParams } from '@/shared/lib/utm';
import { initializeSession, setNetwork, setUtm } from '../stores/sessionSlice';

export default function SessionInitializer() {
    const dispatch = useAppDispatch();
    const searchParams = useSearchParams();
    const t = useTranslations('session');
    const { status, network: storedNetwork, utm: storedUtm } = useAppSelector((state) => state.session);
    const authToken = useAppSelector((state) => state.session.authToken);
    const { error: showError } = useToastActions();

    const utmParam = useMemo(() => getUtmFromSearchParams(searchParams), [searchParams]);
    // console.log('!2', utmParam);

    useEffect(() => {
        if (utmParam && storedUtm !== utmParam) {
            dispatch(setUtm(utmParam));
        }
    }, [dispatch, storedUtm, utmParam]);

    useEffect(() => {
        const resolvedNetwork = getClientNetwork();
        if (storedNetwork !== resolvedNetwork) {
            dispatch(setNetwork(resolvedNetwork));
        }
    }, [dispatch, storedNetwork]);

    useEffect(() => {
        if (status === 'loading') {
            return;
        }

        const hasAuthToken = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) : null;
        const hasClientToken = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN) : null;

        if (status === 'idle' || !hasAuthToken || !hasClientToken) {
            dispatch(initializeSession({ utm: utmParam }));
        }
    }, [dispatch, status, utmParam]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const storedAuthToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        syncAuthCookie(authToken || storedAuthToken);
    }, [authToken]);

    useEffect(() => {
        if (status === 'failed') {
            showError(t('tokenError'));
        }
    }, [status, showError, t]);

    return null;
}
