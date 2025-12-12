'use client';

import { useTheme } from '@/providers/ThemeProvider';
import LoadingScreen from './LoadingScreen';
import { Header, MobileBottomBar } from '@/widgets/header';
import { Footer } from '@/widgets/footer';

interface ThemeAwareContentProps {
    children: React.ReactNode;
}

export default function ThemeAwareContent({ children }: ThemeAwareContentProps) {
    const { isInitialized } = useTheme();

    return (
        <LoadingScreen isLoading={!isInitialized}>
            <Header />
            <main className="min-h-screen pb-24 sm:pb-0">
                {children}
            </main>
            <Footer />
            <MobileBottomBar />
        </LoadingScreen>
    );
}
