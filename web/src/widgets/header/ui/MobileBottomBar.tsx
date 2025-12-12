'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useNavigationItems } from '../model/navigationItems';
import { HomeIcon, UserIcon } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/utils';
import { Avatar, AvatarImage } from '@/shared/ui/avatar';
import { AuthModal, selectAuthUser, selectIsAuthenticated } from '@/features/auth';
import { useAppSelector } from '@/shared/stores/store';

type RouteHref = Parameters<ReturnType<typeof useRouter>['push']>[0];

type BottomNavItem = {
    key: string;
    label: string;
    path: RouteHref;
    icon: ComponentType<{ size?: number; className?: string }>;
    isProfile?: boolean;
};

const ICON_SIZE = 22;

export function MobileBottomBar() {
    const router = useRouter();
    const pathname = usePathname();
    const navigationItems = useNavigationItems();
    const tNavigation = useTranslations('navigation');
    const tSystem = useTranslations('system');
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const user = useAppSelector(selectAuthUser);
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);

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
            <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_-0.25rem_1.5rem_rgba(0,0,0,0.12)]">
                <div className="grid grid-cols-6 gap-1 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
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
                                    'flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors cursor-pointer',
                                    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                )}
                                onClick={handleClick}
                            >
                                {item.isProfile && isAuthenticated && user?.image ? (
                                    <Avatar className="h-10 w-10 rounded-[0.75rem]">
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
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
        </>
    );
}
