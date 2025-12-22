'use client';

import { useEffect } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import LoadingScreen from './LoadingScreen';
import { Header, MobileBottomBar } from '@/widgets/header';
import { Footer } from '@/widgets/footer';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { selectIsApp, setIsApp } from '@/shared/stores/layoutSlice';
import { isApp as detectIsApp } from '@/shared/lib/app';
import { cn } from '@/shared/lib/utils';

interface ThemeAwareContentProps {
    children: React.ReactNode;
}

export default function ThemeAwareContent({ children }: ThemeAwareContentProps) {
    const { isInitialized } = useTheme();
    const dispatch = useAppDispatch();
    const isApp = useAppSelector(selectIsApp);
    const isAppDetected = detectIsApp();
    const shouldUseAppShell = isApp || isAppDetected;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (isApp !== isAppDetected) {
            dispatch(setIsApp(isAppDetected));
        }
    }, [dispatch, isApp, isAppDetected]);

    return (
        <LoadingScreen isLoading={!isInitialized}>
            {shouldUseAppShell ? null : <Header />}
            <div
                className={cn(
                    shouldUseAppShell ? 'pb-[calc(6rem+env(safe-area-inset-bottom))]' : undefined
                )}
            >
                <main className="min-h-screen">
                    {children}
                </main>
                {shouldUseAppShell ? null : <Footer />}
            </div>
            {shouldUseAppShell ? <MobileBottomBar /> : null}
        </LoadingScreen>
    );
}
