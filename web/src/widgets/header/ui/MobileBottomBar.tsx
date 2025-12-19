'use client';

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useBottomNavigationItems } from '../model/bottomNavigationItems';
import { HomeIcon, UserIcon } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/utils';
import { Avatar, AvatarImage } from '@/shared/ui/avatar';
import { AuthModal, selectAuthUser, selectIsAuthenticated } from '@/features/auth';
import { useAppSelector } from '@/shared/stores/store';
import { selectIsMobileBottomBarEnabled } from '@/shared/stores/layoutSlice';

type RouteHref = Parameters<ReturnType<typeof useRouter>['push']>[0];

type BottomNavItem = {
    key: string;
    label: string;
    path: RouteHref;
    icon: ComponentType<{ size?: number; className?: string }>;
    isProfile?: boolean;
};

const ICON_SIZE = 22;
const MOBILE_BOTTOM_BAR_OFFSET_VAR = '--mobile-bottom-bar-offset';

export function MobileBottomBar() {
    const router = useRouter();
    const pathname = usePathname();
    const navigationItems = useBottomNavigationItems();
    const tNavigation = useTranslations('navigation');
    const tSystem = useTranslations('system');
    const isMobileBottomBarEnabled = useAppSelector(selectIsMobileBottomBarEnabled);
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const user = useAppSelector(selectAuthUser);
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const navRef = useRef<HTMLElement | null>(null);

    const items = useMemo<BottomNavItem[]>(
        () => [
            {
                key: 'home',
                label: tNavigation('home'),
                path: '/' as RouteHref,
                icon: HomeIcon,
            },
            ...navigationItems.map<BottomNavItem>(item => ({
                key: item.key,
                label: item.label,
                path: item.path,
                icon: item.icon,
            })),
            {
                key: 'profile',
                label: isAuthenticated ? tSystem('profile') : tSystem('sign_in'),
                path: '/profile' as RouteHref,
                icon: UserIcon,
                isProfile: true,
            },
        ],
        [isAuthenticated, navigationItems, tNavigation, tSystem]
    );

    useEffect(() => {
        if (isAuthenticated && isAuthModalOpen) {
            setAuthModalOpen(false);
        }
    }, [isAuthenticated, isAuthModalOpen]);

    useEffect(() => {
        const nav = navRef.current;
        const root = document.documentElement;
        if (!isMobileBottomBarEnabled || !nav) {
            root.style.removeProperty(MOBILE_BOTTOM_BAR_OFFSET_VAR);
            return;
        }

        const setOffset = (height: number) => {
            const safeHeight = Math.max(0, Math.ceil(height));
            root.style.setProperty(MOBILE_BOTTOM_BAR_OFFSET_VAR, `${safeHeight}px`);
        };

        const updateOffset = () => {
            setOffset(nav.getBoundingClientRect().height);
        };

        updateOffset();

        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(updateOffset)
            : null;
        resizeObserver?.observe(nav);
        window.addEventListener('resize', updateOffset);

        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', updateOffset);
            root.style.removeProperty(MOBILE_BOTTOM_BAR_OFFSET_VAR);
        };
    }, [isMobileBottomBarEnabled]);

    const handleNavigate = (path: RouteHref) => {
        router.push(path);
    };

    const isActive = (path: RouteHref) => {
        if (typeof path !== 'string') {
            return false;
        }

        if (path === '/') {
            return pathname === '/';
        }

        return pathname?.startsWith(path);
    };

    return (
        <>
            {isMobileBottomBarEnabled ? (
                <nav
                    ref={navRef}
                    className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_-0.25rem_1.5rem_rgba(0,0,0,0.12)]"
                >
                    <div className="grid grid-cols-5 gap-1 px-4 pb-[env(safe-area-inset-bottom)]">
                        {items.map(item => {
                            const Icon = item.icon;
                            const active = isActive(item.path);

                            const handleClick = () => {
                                if (item.isProfile && !isAuthenticated) {
                                    setAuthModalOpen(true);
                                    return;
                                }

                                handleNavigate(item.path);
                            };

                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    className={cn(
                                        'flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors cursor-pointer',
                                        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                    onClick={handleClick}
                                >
                                    {item.isProfile && isAuthenticated && user?.image ? (
                                        <Avatar className="h-8 w-8 rounded-[0.75rem]">
                                            <AvatarImage src={user.image} alt={user.name || tSystem('profile')} />
                                        </Avatar>
                                    ) : (
                                        <Icon size={ICON_SIZE} className="shrink-0" />
                                    )}
                                    <span className="text-[11px] leading-4 text-current">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </nav>
            ) : null}
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
        </>
    );
}
