'use client';

import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { cleanupExpiredToasts } from '@/shared/stores/toastSlice';

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
            visibleToasts={maxToasts}
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
