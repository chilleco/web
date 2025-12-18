'use client';

import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { cleanupExpiredToasts } from '@/shared/stores/toastSlice';
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon, LoadingIcon, XIcon } from '@/shared/ui/icons';

const TOASTER_BOTTOM_OFFSET = 'calc(24px + var(--mobile-bottom-bar-offset, 0px))';
const TOASTER_MOBILE_BOTTOM_OFFSET = 'calc(16px + var(--mobile-bottom-bar-offset, 0px))';
const TOASTER_ICON_SIZE = 18;

export function ToastProvider() {
    const dispatch = useAppDispatch();
    const { position, maxToasts, defaultDuration } = useAppSelector((state) => state.toast);

    // Clean up expired toasts periodically
    useEffect(() => {
        const interval = setInterval(() => {
            dispatch(cleanupExpiredToasts());
        }, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, [dispatch]);

    return (
        <Toaster
            position={position}
            richColors
            closeButton
            expand={true}
            offset={{ bottom: TOASTER_BOTTOM_OFFSET }}
            mobileOffset={{ bottom: TOASTER_MOBILE_BOTTOM_OFFSET }}
            visibleToasts={maxToasts}
            icons={{
                success: <CheckIcon size={TOASTER_ICON_SIZE} />,
                error: <XIcon size={TOASTER_ICON_SIZE} />,
                warning: <AlertIcon size={TOASTER_ICON_SIZE} />,
                info: <InfoIcon size={TOASTER_ICON_SIZE} />,
                loading: <LoadingIcon size={TOASTER_ICON_SIZE} className="animate-spin" />,
                close: <CloseIcon size={16} />,
            }}
            toastOptions={{
                duration: defaultDuration,
                classNames: {
                    toast: 'feedback-toast',
                    success: 'feedback-toast--success',
                    error: 'feedback-toast--error',
                    warning: 'feedback-toast--warning',
                    info: 'feedback-toast--info',
                    loading: 'feedback-toast--loading',
                    title: 'feedback-toast__title',
                    description: 'feedback-toast__description',
                    closeButton: 'feedback-toast__close',
                    actionButton: 'feedback-toast__action',
                    cancelButton: 'feedback-toast__cancel',
                },
                unstyled: false,
            }}
            theme={undefined}
        />
    );
}

export default ToastProvider;
