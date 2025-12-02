'use client';

import { useEffect } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import LoadingScreen from './LoadingScreen';
import { Header } from '@/widgets/header';
import { Footer } from '@/widgets/footer';

interface ThemeAwareContentProps {
    children: React.ReactNode;
}

export default function ThemeAwareContent({ children }: ThemeAwareContentProps) {
    const { isInitialized } = useTheme();

    useEffect(() => {
        const handleWheel = (event: WheelEvent) => {
            const target = event.target;
            if (target instanceof HTMLInputElement && target.type === 'number') {
                event.preventDefault();
                event.stopPropagation();
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, []);

    return (
        <LoadingScreen isLoading={!isInitialized}>
            <Header />
            <main className="min-h-screen">
                {children}
            </main>
            <Footer />
        </LoadingScreen>
    );
}
