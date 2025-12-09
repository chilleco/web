'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { PageHeader } from '@/shared/ui/page-header';
import { Box } from '@/shared/ui/box';
import { UserIcon, ShieldIcon, SaveIcon, RefreshIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { getUserById, updateUserProfile } from '@/entities/user/api/userApi';
import type { User, UpdateProfileRequest } from '@/entities/user/model/user';
import type { FileData } from '@/shared/ui/file-upload';
import { uploadFile } from '@/shared/services/api/upload';
import { IconButton } from '@/shared/ui/icon-button';
import { ButtonGroup } from '@/shared/ui/button-group';
import { setUser as setAuthUser } from '@/features/auth';
import type { AuthProfile } from '@/features/auth/stores/authSlice';
import { UserFormFields } from '@/widgets/user-management/ui/UserFormFields';
import { buildUserFormState, sanitizePhoneValue, type UserFormState } from '@/widgets/user-management/lib/userFormUtils';

const profileFields: Array<keyof UserFormState> = ['login', 'name', 'surname', 'mail', 'phone', 'image'];

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
    const [formData, setFormData] = useState<UserFormState>(buildUserFormState(null));
    const [initialData, setInitialData] = useState<UserFormState | null>(null);
    const fetchedUserIdRef = useRef<number | null>(null);

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
        const nextState = buildUserFormState(display as Partial<User>);
        setFormData(nextState);
        setInitialData(nextState);
    }, [display]);

    const statusLabel = useMemo(() => {
        if (display?.status === undefined || display?.status === null) {
            return tProfile('statusUnknown');
        }
        return tProfile('statusValue', { value: display.status });
    }, [display?.status, tProfile]);

    const hasChanges = useMemo(() => {
        if (!initialData) return false;
        return profileFields.some((key) => initialData[key] !== formData[key]);
    }, [formData, initialData]);

    const handleFieldChange = useCallback((field: keyof UserFormState, value: string) => {
        const nextValue = field === 'phone' ? sanitizePhoneValue(value) : value;
        setFormData((prev) => ({
            ...prev,
            [field]: nextValue,
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

        const payload: UpdateProfileRequest = {};
        const payloadDraft = payload as Record<string, string | number | boolean | null>;

        profileFields.forEach((field) => {
            const value = formData[field];
            if (initialData[field] !== value) {
                if (field === 'phone') {
                    payload.phone = value ? sanitizePhoneValue(value) : null;
                } else {
                    payloadDraft[field] = value || null;
                }
            }
        });

        if (Object.keys(payload).length === 0) {
            showInfo(tProfile('noChanges'));
            return;
        }

        setIsSaving(true);
        try {
            const updatedUser = await updateUserProfile(payload);
            const normalized = buildUserFormState(updatedUser);
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
                    <UserFormFields
                        data={formData}
                        onChange={handleFieldChange}
                        onFileChange={handleFileChange}
                        onFileRemove={handleFileRemove}
                        disabled={isActionDisabled}
                        uploadingImage={uploadingImage}
                        imageFileData={imageFileData}
                        labels={{
                            name: tProfile('name'),
                            surname: tProfile('surname'),
                            login: tProfile('login'),
                            mail: tProfile('mail'),
                            phone: tProfile('phone'),
                            password: tProfile('password'),
                        }}
                        showPasswordPlaceholder
                    />

                    <div className="flex justify-center items-center text-muted-foreground gap-2">
                        <ShieldIcon size={16} />
                        <span>{statusLabel}</span>
                    </div>
                </Box>
            </div>
        </div>
    );
}
