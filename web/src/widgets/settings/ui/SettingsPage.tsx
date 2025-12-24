'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Box } from '@/shared/ui/box';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Logo, ThemeSwitcher } from '@/shared/components/layout';
import { LanguageSwitcher } from '@/features/navigation';
import { CategoriesHoverPopup } from '@/widgets/category';
import { Footer } from '@/widgets/footer';
import {
    ChartIcon,
    CreditCardIcon,
    LoginIcon,
    LogoutIcon,
    SearchIcon,
    SettingsIcon,
    ShieldIcon,
    UserIcon,
} from '@/shared/ui/icons';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { AuthModal, logout, selectAuthUser, selectIsAuthenticated } from '@/features/auth';
import { SpacesSelector } from '@/features/spaces';
import { useToastActions } from '@/shared/hooks/useToast';
import { useNavigationItems } from '@/widgets/header/model/navigationItems';
import { Avatar, AvatarImage } from '@/shared/ui/avatar';

type RouteHref = Parameters<ReturnType<typeof useRouter>['push']>[0];

function LogoBlock({ onHome }: { onHome: () => void }) {
    return (
        <div className="flex items-center">
            <button
                type="button"
                onClick={onHome}
                className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
            >
                <Logo />
            </button>
        </div>
    );
}

function SearchBlock({ onSubmit }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
    const tSystem = useTranslations('system');

    return (
        <form onSubmit={onSubmit} className="relative">
            <Input
                name="search"
                placeholder={`${tSystem('search')}...`}
                className="w-full pr-10"
                title=""
                autoComplete="off"
            />
            <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
                <SearchIcon size={16} />
            </button>
        </form>
    );
}

function SectionsBlock({ onNavigate }: { onNavigate: (path: RouteHref) => void }) {
    const tNav = useTranslations('navigation');
    const locale = useLocale();
    const navigationItems = useNavigationItems();

    return (
        <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {tNav('sections')}
            </div>
            <div className="space-y-2">
                {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const button = (
                        <Button
                            key={item.key}
                            variant="outline"
                            className="w-full justify-start gap-3 h-12"
                            onClick={() => onNavigate(item.path)}
                        >
                            <Icon size={18} />
                            <span>{item.label}</span>
                        </Button>
                    );

                    if (item.withCategoriesPopup) {
                        return (
                            <CategoriesHoverPopup key={item.key} locale={locale}>
                                {button}
                            </CategoriesHoverPopup>
                        );
                    }

                    return button;
                })}
            </div>
        </div>
    );
}

function AccountBlock({
    isAuthenticated,
    onSignIn,
    onOpenProfile,
    onNavigate,
    onSignOut,
}: {
    isAuthenticated: boolean;
    onSignIn: () => void;
    onOpenProfile: () => void;
    onNavigate: (path: RouteHref) => void;
    onSignOut: () => void;
}) {
    const tSystem = useTranslations('system');
    const user = useAppSelector(selectAuthUser);
    const isAdmin = Boolean(user?.status !== undefined && user.status >= 4);

    const fullName = [user?.name, user?.surname].filter(Boolean).join(' ').trim();
    const profileLabel = isAuthenticated
        ? fullName || tSystem('open_profile')
        : tSystem('sign_in');

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-12"
                    onClick={isAuthenticated ? onOpenProfile : onSignIn}
                >
                    {isAuthenticated ? (
                        user?.image ? (
                            <Avatar className="h-8 w-8 rounded-[0.75rem]">
                                <AvatarImage src={user.image} alt={fullName || tSystem('profile')} />
                            </Avatar>
                        ) : (
                            <UserIcon size={18} />
                        )
                    ) : (
                        <LoginIcon size={18} />
                    )}
                    <span>{profileLabel}</span>
                </Button>

                {isAuthenticated ? (
                    <Button
                        variant="destructive"
                        className="w-full justify-start gap-3 h-12"
                        onClick={onSignOut}
                    >
                        <LogoutIcon size={18} />
                        <span>{tSystem('sign_out')}</span>
                    </Button>
                ) : null}
            </div>

            {!isAuthenticated ? null : (
                <>
                    <SpacesSelector userId={user?.id} navigateOnSelect={false} />

                    <div className="space-y-2">
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-3 h-12"
                            onClick={() => onNavigate('/settings')}
                        >
                            <SettingsIcon size={18} />
                            <span>{tSystem('settings')}</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-3 h-12"
                            onClick={() => onNavigate('/billing')}
                        >
                            <CreditCardIcon size={18} />
                            <span>{tSystem('billing')}</span>
                        </Button>
                        {isAdmin ? (
                            <>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-3 h-12"
                                    onClick={() => onNavigate('/analytics')}
                                >
                                    <ChartIcon size={18} />
                                    <span>{tSystem('analytics')}</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-3 h-12"
                                    onClick={() => onNavigate('/admin')}
                                >
                                    <ShieldIcon size={18} />
                                    <span>{tSystem('admin_panel')}</span>
                                </Button>
                            </>
                        ) : null}
                    </div>
                </>
            )}
        </div>
    );
}

export default function SettingsPage() {
    console.log('!SETS1');
    const tSystem = useTranslations('system');
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { success: showSuccess, error: showError } = useToastActions();
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);

    const handleNavigate = (path: RouteHref) => {
        console.log('!SETS2');
        router.push(path);
    };

    const handleHome = () => {
        console.log('!SETS3');
        handleNavigate('/');
    }

    const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        console.log('!SETS4');
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const query = formData.get('search') as string;
        if (query.trim()) {
            console.log('Search query:', query);
        }
    };

    const handleOpenProfile = () => handleNavigate('/profile');

    const handleSignOut = async () => {
        try {
            await dispatch(logout()).unwrap();
            showSuccess(tSystem('sign_out'));
        } catch (err) {
            const message = err instanceof Error ? err.message : tSystem('error');
            showError(message);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto space-y-6">
                    <LogoBlock onHome={handleHome} />

                    {/* <PageHeader
                        icon={settingsIcon}
                        iconClassName="bg-muted text-foreground"
                        title={tSystem('settings')}
                    /> */}

                    <Box size="lg" className="space-y-8">
                        <SearchBlock onSubmit={handleSearchSubmit} />

                        <SectionsBlock onNavigate={handleNavigate} />

                        {/* <div className="space-y-3">
                            <ThemeSwitcher className="w-full" />
                            <LanguageSwitcher className="w-full" />
                        </div> */}

                        <AccountBlock
                            isAuthenticated={isAuthenticated}
                            onSignIn={() => setAuthModalOpen(true)}
                            onOpenProfile={handleOpenProfile}
                            onNavigate={handleNavigate}
                            onSignOut={handleSignOut}
                        />
                    </Box>
                </div>
            </div>

            <div className="sm:hidden">
                <Footer />
            </div>

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
        </div>
    );
}
