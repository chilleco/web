'use client';

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { PageHeader } from '@/shared/ui/page-header';
import { Box } from '@/shared/ui/box';
import { Input } from '@/shared/ui/input';
import { UserIcon, ShieldIcon, SaveIcon, RefreshIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { getUserById, updateUserProfile } from '@/entities/user/api/userApi';
import type { User, UpdateProfileRequest } from '@/entities/user/model/user';
import { FileUpload } from '@/shared/ui/file-upload';
import type { FileData } from '@/shared/ui/file-upload';
import { uploadFile } from '@/shared/services/api/upload';
import { IconButton } from '@/shared/ui/icon-button';
import { ButtonGroup } from '@/shared/ui/button-group';
import { setUser as setAuthUser } from '@/features/auth';
import type { AuthProfile } from '@/features/auth/stores/authSlice';

type ProfileFormState = {
    login: string;
    name: string;
    surname: string;
    mail: string;
    phone: string;
    image: string;
};

export default function ProfilePage() {
    const tSystem = useTranslations('system');
    const tProfile = useTranslations('profile');
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { success: showSuccess, error: showError, info: showInfo } = useToastActions();
    const authUser = useAppSelector((state) => state.auth.user);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [imageFileData, setImageFileData] = useState<FileData | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [formData, setFormData] = useState<ProfileFormState>({
        login: '',
        name: '',
        surname: '',
        mail: '',
        phone: '',
        image: '',
    });
    const [initialData, setInitialData] = useState<ProfileFormState | null>(null);
    const fetchedUserIdRef = useRef<number | null>(null);

    const buildFormState = useCallback((source: Partial<User> | null): ProfileFormState => {
        const toString = (value: string | number | null | undefined) => {
            if (value === null || value === undefined) return '';
            return String(value);
        };

        return {
            login: toString(source?.login),
            name: toString(source?.name),
            surname: toString(source?.surname),
            mail: toString(source?.mail),
            phone: toString(source?.phone),
            image: toString(source?.image),
        };
    }, []);

    useEffect(() => {
        if (!authUser?.id) {
            router.push('/');
            setIsLoading(false);
            fetchedUserIdRef.current = null;
            return;
        }

        if (fetchedUserIdRef.current === authUser.id) {
            setIsLoading(false);
            return;
        }

        fetchedUserIdRef.current = authUser.id;
        setIsLoading(true);

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
        if (!display) return;
        const nextState = buildFormState(display);
        setFormData(nextState);
        setInitialData(nextState);
    }, [buildFormState, display]);

    const statusLabel = useMemo(() => {
        if (display?.status === undefined || display?.status === null) {
            return tProfile('statusUnknown');
        }
        return tProfile('statusValue', { value: display.status });
    }, [display?.status, tProfile]);

    const hasChanges = useMemo(() => {
        if (!initialData) return false;
        return (Object.keys(initialData) as Array<keyof ProfileFormState>).some(
            (key) => initialData[key] !== formData[key]
        );
    }, [formData, initialData]);

    const handleInputChange = useCallback((field: keyof ProfileFormState) => (event: ChangeEvent<HTMLInputElement>) => {
        let { value } = event.target;
        if (field === 'phone') {
            value = value.replace(/\D/g, '');
        }
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    }, []);

    const handleFileChange = (file: File | null, preview: string | null, data: FileData | null) => {
        if (!file) {
            setImageFileData(null);
            setFormData((prev) => ({ ...prev, image: '' }));
            return;
        }

        setUploadingImage(true);
        setImageFileData(data);

        if (preview) {
            setFormData((prev) => ({ ...prev, image: preview }));
        }

        uploadFile(file)
            .then((url) => {
                setFormData((prev) => ({ ...prev, image: url }));
                setImageFileData(data ? { ...data, preview: url, type: 'image' as const } : null);
            })
            .catch((err) => {
                const message = err instanceof Error ? err.message : tSystem('error');
                showError(message);
            })
            .finally(() => setUploadingImage(false));
    };

    const handleFileRemove = () => {
        setImageFileData(null);
        setFormData((prev) => ({ ...prev, image: '' }));
    };

    const handleReset = () => {
        if (!initialData) return;
        setFormData(initialData);
        setImageFileData(null);
    };

    const handleSave = async () => {
        if (!initialData) return;

        const payload = Object.entries(formData).reduce<UpdateProfileRequest>((acc, [key, value]) => {
            const typedKey = key as keyof ProfileFormState;
            if (initialData[typedKey] !== value) {
                if (typedKey === 'phone') {
                    acc.phone = value ? value.replace(/\D/g, '') : null;
                } else {
                    acc[typedKey as keyof UpdateProfileRequest] = value;
                }
            }
            return acc;
        }, {});

        if (Object.keys(payload).length === 0) {
            showInfo(tProfile('noChanges'));
            return;
        }

        setIsSaving(true);
        try {
            const updatedUser = await updateUserProfile(payload);
            const normalized = buildFormState(updatedUser);
            setUser(updatedUser);
            setFormData(normalized);
            setInitialData(normalized);
            const authPayload: AuthProfile = {
                ...(authUser ?? {}),
                ...updatedUser,
                login: updatedUser.login ?? authUser?.login ?? null,
            };
            dispatch(setAuthUser(authPayload));
            showSuccess(tProfile('saveSuccess'));
        } catch (err) {
            const message = err instanceof Error ? err.message : tProfile('saveError');
            showError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const isActionDisabled = isSaving || uploadingImage || isLoading;

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <PageHeader
                    icon={<UserIcon size={24} />}
                    iconClassName="bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                    title={tSystem('profile')}
                    description={tProfile('description')}
                    actions={
                        <ButtonGroup>
                            <IconButton
                                icon={<SaveIcon size={16} />}
                                responsive
                                onClick={handleSave}
                                disabled={!hasChanges || isActionDisabled}
                            >
                                {isSaving ? tSystem('saving') : tSystem('save')}
                            </IconButton>
                            <IconButton
                                icon={<RefreshIcon size={16} />}
                                variant="outline"
                                responsive
                                onClick={handleReset}
                                disabled={!hasChanges || isActionDisabled}
                            >
                                {tSystem('cancel')}
                            </IconButton>
                        </ButtonGroup>
                    }
                />
                <Box className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                        <div className="h-full">
                            <FileUpload
                                value={formData.image}
                                fileData={imageFileData ? { ...imageFileData, type: 'image' as const } : null}
                                onFileChange={handleFileChange}
                                onFileRemove={handleFileRemove}
                                fileTypes="images"
                                width="w-full h-full"
                                height={320}
                                disabled={isActionDisabled}
                            />
                        </div>
                        <div className="space-y-3 h-full">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Input
                                    placeholder={tProfile('name')}
                                    value={formData.name}
                                    onChange={handleInputChange('name')}
                                    disabled={isActionDisabled}
                                    className="bg-muted border-0 text-base text-foreground"
                                />
                                <Input
                                    placeholder={tProfile('surname')}
                                    value={formData.surname}
                                    onChange={handleInputChange('surname')}
                                    disabled={isActionDisabled}
                                    className="bg-muted border-0 text-base text-foreground"
                                />
                            </div>
                            <div className="flex items-center rounded-[0.75rem] bg-muted h-12 overflow-hidden px-3 gap-3">
                                <span className="text-base text-muted-foreground">@</span>
                                <Input
                                    placeholder={tProfile('login')}
                                    value={formData.login}
                                    onChange={handleInputChange('login')}
                                    disabled={isActionDisabled}
                                    className="bg-transparent border-0 text-base text-foreground rounded-none shadow-none focus:ring-0 focus:outline-none h-full px-0"
                                />
                            </div>
                            <Input
                                placeholder={tProfile('mail')}
                                value={formData.mail}
                                onChange={handleInputChange('mail')}
                                disabled={isActionDisabled}
                                className="bg-muted border-0 text-base text-foreground"
                            />
                            <div className="flex items-center rounded-[0.75rem] bg-muted h-12 overflow-hidden px-3 gap-3">
                                <span className="text-base text-muted-foreground">+</span>
                                <Input
                                    placeholder={tProfile('phone')}
                                    value={formData.phone}
                                    onChange={handleInputChange('phone')}
                                    disabled={isActionDisabled}
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="bg-transparent border-0 text-base text-foreground rounded-none shadow-none focus:ring-0 focus:outline-none h-full px-0"
                                />
                            </div>
                            <Input
                                placeholder={tProfile('password')}
                                value="••••••••"
                                readOnly
                                disabled
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
