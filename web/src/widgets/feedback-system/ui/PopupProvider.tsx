'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import Popup, { PopupProps } from './Popup';

interface PopupContextType {
    // Basic popup control
    showPopup: (props: Omit<PopupProps, 'isOpen' | 'onClose'>) => void;
    closePopup: () => void;

    // Convenience methods
    showAlert: (options: {
        title?: string;
        message: string;
        confirmText?: string;
    }) => Promise<void>;

    showConfirm: (options: {
        title?: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        variant?: 'default' | 'destructive';
    }) => Promise<boolean>;

    // State
    isOpen: boolean;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

interface PopupProviderProps {
    children: ReactNode;
}

export function PopupProvider({ children }: PopupProviderProps) {
    const tSystem = useTranslations('system');
    const [isOpen, setIsOpen] = useState(false);
    const [popupProps, setPopupProps] = useState<Omit<PopupProps, 'isOpen' | 'onClose'>>({});
    const [currentPromiseResolve, setCurrentPromiseResolve] = useState<(() => void) | null>(null);

    const showPopup = useCallback((props: Omit<PopupProps, 'isOpen' | 'onClose'>) => {
        setPopupProps(props);
        setIsOpen(true);
    }, []);

    const finishPopup = useCallback((resolve?: () => void) => {
        resolve?.();
        setCurrentPromiseResolve(null);
        setPopupProps({});
        setIsOpen(false);
    }, []);

    const closePopup = useCallback(() => {
        finishPopup(currentPromiseResolve ?? undefined);
    }, [currentPromiseResolve, finishPopup]);

    const showAlert = useCallback((options: {
        title?: string;
        message: string;
        confirmText?: string;
    }) => {
        return new Promise<void>((resolve) => {
            setCurrentPromiseResolve(() => () => resolve());
            showPopup({
                title: options.title,
                children: <p className="text-sm text-muted-foreground">{options.message}</p>,
                actions: (
                    <Button
                        onClick={() => {
                            finishPopup(() => resolve());
                        }}
                        className="w-full sm:w-auto"
                    >
                        {options.confirmText || tSystem('ok')}
                    </Button>
                )
            });
        });
    }, [finishPopup, showPopup, tSystem]);

    const showConfirm = useCallback((options: {
        title?: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        variant?: 'default' | 'destructive';
    }) => {
        return new Promise<boolean>((resolve) => {
            setCurrentPromiseResolve(() => () => resolve(false));
            showPopup({
                title: options.title,
                children: <p className="text-sm text-muted-foreground">{options.message}</p>,
                actions: (
                    <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={() => {
                                finishPopup(() => resolve(false));
                            }}
                            className="flex-1 sm:flex-none"
                        >
                            {options.cancelText || tSystem('cancel')}
                        </Button>
                        <Button
                            variant={options.variant === 'destructive' ? 'destructive' : 'default'}
                            onClick={() => {
                                finishPopup(() => resolve(true));
                            }}
                            className="flex-1 sm:flex-none"
                        >
                            {options.confirmText || tSystem('confirm')}
                        </Button>
                    </div>
                )
            });
        });
    }, [finishPopup, showPopup, tSystem]);

    const contextValue: PopupContextType = {
        showPopup,
        closePopup,
        showAlert,
        showConfirm,
        isOpen
    };

    return (
        <PopupContext.Provider value={contextValue}>
            {children}
            <Popup
                {...popupProps}
                isOpen={isOpen}
                onClose={closePopup}
            />
        </PopupContext.Provider>
    );
}

export function usePopup() {
    const context = useContext(PopupContext);
    if (context === undefined) {
        throw new Error('usePopup must be used within a PopupProvider');
    }
    return context;
}

// Example usage hook for common patterns
export function usePopupActions() {
    const { showAlert, showConfirm, showPopup, closePopup } = usePopup();
    const tSystem = useTranslations('system');

    return {
        // Simple alert
        alert: showAlert,

        // Confirmation dialog
        confirm: showConfirm,

        // Custom popup
        show: showPopup,
        close: closePopup,

        // Quick success/error alerts
        success: (message: string) => showAlert({
            title: tSystem('success'),
            message,
            confirmText: tSystem('ok')
        }),

        error: (message: string) => showAlert({
            title: tSystem('error'),
            message,
            confirmText: tSystem('ok')
        }),

        // Destructive confirmation
        confirmDelete: (message: string = tSystem('deleteItemConfirm', { item: tSystem('item') })) =>
            showConfirm({
                title: tSystem('delete'),
                message,
                confirmText: tSystem('delete'),
                cancelText: tSystem('cancel'),
                variant: 'destructive'
            })
    };
}
