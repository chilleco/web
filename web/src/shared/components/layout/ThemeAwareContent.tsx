'use client';

import { useTheme } from '@/providers/ThemeProvider';
import LoadingScreen from './LoadingScreen';
import { Header, MobileBottomBar } from '@/widgets/header';
import { Footer } from '@/widgets/footer';
import { useAppSelector } from '@/shared/stores/store';
import { selectIsMobileBottomBarEnabled } from '@/shared/stores/layoutSlice';
import { cn } from '@/shared/lib/utils';

interface ThemeAwareContentProps {
    children: React.ReactNode;
}

export default function ThemeAwareContent({ children }: ThemeAwareContentProps) {
    const { isInitialized } = useTheme();
    const isMobileBottomBarEnabled = useAppSelector(selectIsMobileBottomBarEnabled);

    return (
        <LoadingScreen isLoading={!isInitialized}>
            <div className={cn(isMobileBottomBarEnabled ? 'hidden sm:block' : undefined)}>
                <Header />
            </div>
            <div
                className={cn(
                    isMobileBottomBarEnabled ? 'pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-0' : undefined
                )}
            >
                <main className="min-h-screen">
                    {children}
                </main>
                <div className={cn(isMobileBottomBarEnabled ? 'hidden sm:block' : undefined)}>
                    <Footer />
                </div>
            </div>
            <MobileBottomBar />
        </LoadingScreen>
    );
}
