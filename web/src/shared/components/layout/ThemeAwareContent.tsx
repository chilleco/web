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
            <div className="pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-0">
                <main className="min-h-screen">
                    {children}
                </main>
                <Footer />
            </div>
            <MobileBottomBar />
        </LoadingScreen>
    );
}
