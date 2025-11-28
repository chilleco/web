'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { PageHeader } from '@/shared/ui/page-header';
import { Box } from '@/shared/ui/box';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { UserIcon, ShieldIcon, PhoneIcon, MailIcon, UserIcon as LoginUserIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { useAppSelector } from '@/shared/stores/store';
import { getUserById } from '@/entities/user/api/userApi';
import type { User } from '@/entities/user/model/user';
import { FileUpload } from '@/shared/ui/file-upload';
import { Button } from '@/shared/ui/button';

export default function ProfilePage() {
    const tSystem = useTranslations('system');
    const tProfile = useTranslations('profile');
    const router = useRouter();
    const { error: showError } = useToastActions();
    const authUser = useAppSelector((state) => state.auth.user);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const statusLabel = useMemo(() => {
        if (!authUser?.status) return tProfile('statusUnknown');
        return tProfile('statusValue', { value: authUser.status });
    }, [authUser?.status, tProfile]);

    useEffect(() => {
        if (!authUser?.id) {
            router.push('/');
            return;
        }

        const fetchUser = async () => {
            try {
                const fetched = await getUserById(authUser.id);
                setUser(fetched);
            } catch (err) {
                const message = err instanceof Error ? err.message : tProfile('loadError');
                showError(message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUser();
    }, [authUser?.id, router, showError, tProfile]);

    const display = user || authUser;

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <PageHeader
                    icon={<UserIcon size={24} />}
                    iconClassName="bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                    title={tSystem('profile')}
                    description={tProfile('description')}
                />
                <Box className="mt-6 space-y-6">
                    <FileUpload
                        value={display?.image || ''}
                        onFileChange={() => undefined}
                        onFileRemove={() => undefined}
                        disabled
                        height={360}
                        fileTypes="images"
                        className="border-dashed border-2 border-muted-foreground/50 bg-card"
                    />
                    <div className="flex justify-center items-center text-muted-foreground gap-2">
                        <ShieldIcon size={16} />
                        <span>{tProfile('locked')}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                            placeholder={tProfile('name')}
                            value={display?.name || ''}
                            disabled
                            readOnly
                        />
                        <Input
                            placeholder={tProfile('surname')}
                            value={display?.surname || ''}
                            disabled
                            readOnly
                        />
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <PhoneIcon size={16} />
                        </span>
                        <Input
                            className="pl-10"
                            placeholder={tProfile('phone')}
                            value={display?.phone || ''}
                            disabled
                            readOnly
                        />
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <LoginUserIcon size={16} />
                        </span>
                        <Input
                            className="pl-10"
                            placeholder={tProfile('login')}
                            value={display?.login || ''}
                            disabled
                            readOnly
                        />
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <MailIcon size={16} />
                        </span>
                        <Input
                            className="pl-10"
                            placeholder={tProfile('mail')}
                            value={display?.mail || ''}
                            disabled
                            readOnly
                        />
                    </div>
                    <Input
                        placeholder={tProfile('password')}
                        value="••••••••"
                        disabled
                        readOnly
                    />
                </Box>
            </div>
        </div>
    );
}
