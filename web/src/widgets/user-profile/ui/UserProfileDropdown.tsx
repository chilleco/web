'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import {
    UserIcon,
    SettingsIcon,
    CreditCardIcon,
    ChartIcon,
    ShieldIcon,
    LogoutIcon,
    LoginIcon,
} from '@/shared/ui/icons';
import { IconButton } from '@/shared/ui/icon-button';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { AuthModal, logout, selectAuthUser, selectIsAuthenticated } from '@/features/auth';
import { useToastActions } from '@/shared/hooks/useToast';
import { SpacesSelector } from '@/features/spaces';

interface UserProfileDropdownProps {
    className?: string;
}

export default function UserProfileDropdown({ className }: UserProfileDropdownProps) {
    const t = useTranslations('system');
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { success, error } = useToastActions();
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const user = useAppSelector(selectAuthUser);
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const userName = useMemo(() => {
        if (!user) return t('guest');
        return [user.name, user.surname].filter(Boolean).join(' ').trim() || user.login || t('guest');
    }, [user, t]);

    const userEmail = user?.mail || '';
    const avatar = user?.image || undefined;

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleProfileClick = () => {
        router.push('/profile');
    };

    const handleSettingsClick = () => {
        router.push('/settings');
    };

    const handleBillingClick = () => {
        router.push('/billing');
    };

    const handleAnalyticsClick = () => {
        router.push('/analytics');
    };

    const handleAdminClick = () => {
        router.push('/admin');
    };

    const handleSignOut = async () => {
        try {
            await dispatch(logout()).unwrap();
            success(t('sign_out'));
        } catch (err) {
            const message = err instanceof Error ? err.message : t('error');
            error(message);
        }
    };

    if (!isAuthenticated) {
        return (
            <>
                <IconButton
                    icon={<LoginIcon size={16} />}
                    onClick={() => setAuthModalOpen(true)}
                    responsive
                >
                    {t('sign_in')}
                </IconButton>
                <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
            </>
        );
    }

    return (
        <>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className={className ? `justify-start gap-3 h-12 ${className}` : "relative h-8 w-8 rounded-[0.75rem]"}
                    >
                        <Avatar className="h-8 w-8 rounded-[0.75rem]">
                            {avatar && <AvatarImage src={avatar} alt={userName} />}
                            {avatar ? (
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                    {getInitials(userName)}
                                </AvatarFallback>
                            ) : (
                                <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                            )}
                        </Avatar>
                        {className && <span>{userName}</span>}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                        <div className="flex flex-col space-y-1 leading-none">
                            <p className="font-medium">{userName}</p>
                            {userEmail && (
                                <p className="w-[200px] truncate text-sm text-muted-foreground">
                                    {userEmail}
                                </p>
                            )}
                        </div>
                    </div>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-2">
                        <SpacesSelector
                            userId={user?.id}
                            navigateOnSelect={false}
                            onSelect={() => setMenuOpen(false)}
                        />
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
                        <UserIcon size={16} />
                        <span className="ml-2">{t('profile')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
                        <SettingsIcon size={16} />
                        <span className="ml-2">{t('settings')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBillingClick} className="cursor-pointer">
                        <CreditCardIcon size={16} />
                        <span className="ml-2">{t('billing')}</span>
                    </DropdownMenuItem>
                    {user?.status !== undefined && user.status >= 4 && (
                        <>
                            <DropdownMenuItem onClick={handleAnalyticsClick} className="cursor-pointer">
                                <ChartIcon size={16} />
                                <span className="ml-2">{t('analytics')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleAdminClick} className="cursor-pointer">
                                <ShieldIcon size={16} />
                                <span className="ml-2">{t('admin_panel')}</span>
                            </DropdownMenuItem>
                        </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 dark:text-red-400">
                        <LogoutIcon size={16} />
                        <span className="ml-2">{t('sign_out')}</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
        </>
    );
}
