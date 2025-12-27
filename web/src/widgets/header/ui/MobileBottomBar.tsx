'use client';

import { useEffect, useMemo, useRef, type ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useBottomNavigationItems } from '../model/bottomNavigationItems';
import { HomeIcon, UserIcon } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/utils';
import { Avatar, AvatarImage } from '@/shared/ui/avatar';
import { selectAuthUser, selectIsAuthenticated } from '@/features/auth';
import { useAppSelector } from '@/shared/stores/store';
import { selectIsApp } from '@/shared/stores/layoutSlice';
import { isApp as detectIsApp } from '@/shared/lib/app';
import { getVkLaunchQuery } from '@/shared/lib/vk';

type RouteHref = Parameters<ReturnType<typeof useRouter>['push']>[0];
type RouteObjectHref = Extract<RouteHref, { pathname: string }>;

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
    const isApp = useAppSelector(selectIsApp);
    const isAppDetected = detectIsApp();
    const shouldShowBar = isApp || isAppDetected;
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const user = useAppSelector(selectAuthUser);
    const navRef = useRef<HTMLElement | null>(null);
    const vkLaunchQuery = getVkLaunchQuery();

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
                key: 'settings',
                label: tSystem('settings'),
                path: '/settings' as RouteHref,
                icon: UserIcon,
                isProfile: true,
            },
        ],
        [navigationItems, tNavigation, tSystem]
    );

    useEffect(() => {
        const nav = navRef.current;
        const root = document.documentElement;
        if (!shouldShowBar || !nav) {
            root.style.removeProperty(MOBILE_BOTTOM_BAR_OFFSET_VAR);
            return;
        }

        const updateOffset = () => {
            const rect = nav.getBoundingClientRect();
            const offset = Math.max(0, Math.ceil(window.innerHeight - rect.top));
            root.style.setProperty(MOBILE_BOTTOM_BAR_OFFSET_VAR, `${offset}px`);
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
    }, [shouldShowBar]);

    const handleNavigate = (path: RouteHref) => {
        if (!vkLaunchQuery) {
            router.push(path);
            return;
        }

        if (typeof path === 'string') {
            const target = { pathname: path, query: vkLaunchQuery } as RouteObjectHref;
            router.push(target);
            return;
        }

        const target = {
            ...path,
            query: { ...vkLaunchQuery, ...(path.query ?? {}) },
        } as RouteObjectHref;
        router.push(target);
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
            {shouldShowBar ? (
                <nav
                    ref={navRef}
                    className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] inset-x-3 z-50 rounded-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_-0.25rem_1.5rem_rgba(0,0,0,0.12)]"
                >
                    <div className="grid grid-flow-col auto-cols-fr gap-1 px-3 py-1.5">
                        {items.map(item => {
                            const Icon = item.icon;
                            const active = isActive(item.path);

                            const handleClick = () => {
                                handleNavigate(item.path);
                            };

                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    className={cn(
                                        'flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors cursor-pointer',
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
        </>
    );
}
