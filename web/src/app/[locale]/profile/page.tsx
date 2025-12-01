'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { PageHeader } from '@/shared/ui/page-header';
import { Box } from '@/shared/ui/box';
import { Input } from '@/shared/ui/input';
import { UserIcon, ShieldIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { useAppSelector } from '@/shared/stores/store';
import { getUserById } from '@/entities/user/api/userApi';
import type { User } from '@/entities/user/model/user';
import { FileUpload } from '@/shared/ui/file-upload';
import type { FileData } from '@/shared/ui/file-upload';
import { uploadFile } from '@/shared/services/api/upload';

export default function ProfilePage() {
    const tSystem = useTranslations('system');
    const tProfile = useTranslations('profile');
    const router = useRouter();
    const { error: showError } = useToastActions();
    const authUser = useAppSelector((state) => state.auth.user);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [imageFileData, setImageFileData] = useState<FileData | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [image, setImage] = useState<string>('');

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

    useEffect(() => {
        setImage(display?.image || '');
    }, [display?.image]);

    const handleFileChange = (file: File | null, preview: string | null, data: FileData | null) => {
        if (!file) {
            setImageFileData(null);
            setImage('');
            return;
        }

        setUploadingImage(true);
        setImageFileData(data);
        setImage(preview || image);

        uploadFile(file)
            .then((url) => {
                setImage(url);
                setImageFileData(data ? { ...data, preview: url, type: 'image' } : null);
            })
            .catch((err) => {
                const message = err instanceof Error ? err.message : tSystem('error');
                showError(message);
            })
            .finally(() => setUploadingImage(false));
    };

    const handleFileRemove = () => {
        setImageFileData(null);
        setImage('');
    };

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
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                        <div className="h-full">
                            <FileUpload
                                value={image}
                                fileData={image ? { ...imageFileData, type: 'image' as const } : imageFileData}
                                onFileChange={handleFileChange}
                                onFileRemove={handleFileRemove}
                                fileTypes="images"
                                width="w-full h-full"
                                height={320}
                            />
                        </div>
                        <div className="space-y-3 h-full">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Input
                                    placeholder={tProfile('name')}
                                    value={display?.name || ''}
                                    readOnly
                                    className="bg-muted border-0 text-base text-foreground"
                                />
                                <Input
                                    placeholder={tProfile('surname')}
                                    value={display?.surname || ''}
                                    readOnly
                                    className="bg-muted border-0 text-base text-foreground"
                                />
                            </div>
                            <div className="flex items-center rounded-[0.75rem] bg-muted">
                                <span className="px-3 text-base text-foreground">@</span>
                                <Input
                                    placeholder={tProfile('login')}
                                    value={display?.login || ''}
                                    readOnly
                                    className="bg-muted border-0 text-base text-foreground rounded-l-none shadow-none focus:ring-0 focus:outline-none"
                                />
                            </div>
                            <Input
                                placeholder={tProfile('mail')}
                                value={display?.mail || ''}
                                readOnly
                                className="bg-muted border-0 text-base text-foreground"
                            />
                            <div className="flex items-center rounded-[0.75rem] bg-muted">
                                <span className="px-3 text-base text-foreground">+</span>
                                <Input
                                    placeholder={tProfile('phone')}
                                    value={display?.phone || ''}
                                    readOnly
                                    className="bg-muted border-0 text-base text-foreground rounded-l-none shadow-none focus:ring-0 focus:outline-none"
                                />
                            </div>
                            <Input
                                placeholder={tProfile('password')}
                                value="••••••••"
                                readOnly
                                className="bg-muted border-0 text-base text-foreground"
                            />
                        </div>
                    </div>

                    <div className="flex justify-center items-center text-muted-foreground gap-2">
                        <ShieldIcon size={16} />
                        <span>{statusLabel}</span>
                    </div>
                </Box>
            </div>
        </div>
    );
}
