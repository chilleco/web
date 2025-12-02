'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { loginWithSocial, selectIsAuthenticated } from '@/features/auth';
import { useToastActions } from '@/shared/hooks/useToast';
import { Box } from '@/shared/ui/box';
import { PageHeader } from '@/shared/ui/page-header';
import { UserIcon } from '@/shared/ui/icons';

export default function CallbackPage() {
    const tSystem = useTranslations('system');
    const tAuth = useTranslations('auth');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();
    const { success, error: showError } = useToastActions();
    const utm = useAppSelector((state) => state.session.utm);
    const isAuthenticated = useAppSelector(selectIsAuthenticated);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const code = searchParams.get('code');
        if (!code) {
            router.push('/');
            return;
        }

        const queryString = window.location.search;
        let social: string | number = 'vk';
        if (queryString.includes('google')) {
            social = 'g';
        } else if (queryString.includes('telegram')) {
            social = 'tg';
        } else if (queryString.includes('state=fb')) {
            social = 'fb';
        }

        dispatch(loginWithSocial({ social, code, utm }))
            .unwrap()
            .then(() => {
                success(tAuth('loginSuccess'));
                const prev = typeof window !== 'undefined' ? localStorage.getItem('previousPath') : null;
                if (prev) {
                    router.push(prev as Parameters<typeof router.push>[0]);
                } else {
                    router.push('/profile');
                }
            })
            .catch((err) => {
                const message = err instanceof Error ? err.message : tAuth('loginFailed');
                showError(message);
                router.push('/');
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, pathname]);

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/profile');
        }
    }, [isAuthenticated, router]);

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <PageHeader
                    icon={<UserIcon size={24} />}
                    iconClassName="bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                    title={tAuth('title')}
                    description={tAuth('processing')}
                />
                <Box className="mt-6">
                    <p className="text-muted-foreground">{tSystem('loading')}</p>
                </Box>
            </div>
        </div>
    );
}
