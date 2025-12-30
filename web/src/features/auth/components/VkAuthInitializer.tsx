'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useToastActions } from '@/shared/hooks/useToast';
import { useApiErrorMessage } from '@/shared/hooks/useApiErrorMessage';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { isVkMiniApp } from '@/shared/lib/vk';
import { getUtmFromSearchParams } from '@/shared/lib/utm';
import { loginWithVkApp, selectAuthUser } from '../stores/authSlice';

type VkUserInfo = {
    first_name?: string;
    last_name?: string;
    photo_200?: string;
    photo_200_orig?: string;
    photo_100?: string;
};

const getVkUtm = () => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return getUtmFromSearchParams(params);
};

const getVkEmail = () => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('vk_email') || null;
};

const getVkUserInfo = async (): Promise<VkUserInfo | null> => {
    if (typeof window === 'undefined') return null;
    const bridge = window.vkBridge;
    if (!bridge?.send) return null;

    const supportsAsync = (bridge as unknown as { supportsAsync?: (method: string) => Promise<boolean> }).supportsAsync;
    if (typeof supportsAsync === 'function') {
        try {
            const supported = await supportsAsync('VKWebAppGetUserInfo');
            if (!supported) return null;
        } catch {
            // Ignore capability detection errors.
        }
    }

    try {
        const response = await bridge.send('VKWebAppGetUserInfo');
        if (response && typeof response === 'object') {
            return response as VkUserInfo;
        }
    } catch {
        // Ignore VK bridge errors.
    }

    return null;
};

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
        const runAuth = async () => {
            const resolvedUtm = utm || getVkUtm();
            const userInfo = await getVkUserInfo();
            const image = userInfo?.photo_200_orig || userInfo?.photo_200 || userInfo?.photo_100 || null;
            const mail = getVkEmail();

            // console.log(`VK UTM #${resolvedUtm} (${utm} / ${getVkUtm()})`, userInfo);

            return dispatch(
                loginWithVkApp({
                    url,
                    utm: resolvedUtm,
                    name: userInfo?.first_name,
                    surname: userInfo?.last_name,
                    image,
                    mail,
                })
            ).unwrap();
        };

        runAuth()
            .catch((err) => {
                showError(formatApiErrorMessage(err, tSystem('server_error')));
            })
            .finally(() => {
                inFlightRef.current = false;
            });
    }, [dispatch, formatApiErrorMessage, showError, tSystem, utm, user]);

    return null;
}
