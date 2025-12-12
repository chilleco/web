'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ButtonGroup } from '@/shared/ui/button-group';
import { IconButton } from '@/shared/ui/icon-button';
import { SaveIcon, RefreshIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { useApiErrorMessage } from '@/shared/hooks/useApiErrorMessage';
import { saveUser } from '@/entities/user/api/userApi';
import type { SaveUserRequest, User, UserStatus } from '@/entities/user';
import { uploadFile } from '@/shared/services/api/upload';
import { type FileData } from '@/shared/ui/file-upload';
import {
  buildUserFormState,
  sanitizePhoneValue,
  type UserFormState
} from '../lib/userFormUtils';
import { UserFormFields } from './UserFormFields';

interface UserFormProps {
  user: User;
  onSuccess: (user: User) => void;
  onCancel?: () => void;
}

export function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const t = useTranslations('admin.users');
  const tProfile = useTranslations('profile');
  const tSystem = useTranslations('system');
  const { success, error: showError, info: showInfo } = useToastActions();
  const formatApiErrorMessage = useApiErrorMessage();
  const [formData, setFormData] = useState<UserFormState>(buildUserFormState(user));
  const [initialData, setInitialData] = useState<UserFormState>(buildUserFormState(user));
  const [imageFileData, setImageFileData] = useState<FileData | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const nextState = buildUserFormState(user);
    setFormData(nextState);
    setInitialData(nextState);
    setImageFileData(null);
  }, [user]);

  const statusOptions = useMemo(
    () => ([
      { value: '3', label: t('status.active'), code: 3 },
      { value: '1', label: t('status.blocked'), code: 1 },
      { value: '2', label: t('status.pending'), code: 2 },
      { value: '4', label: t('status.moderator'), code: 4 },
      { value: '5', label: t('status.manager'), code: 5 },
      { value: '6', label: t('status.admin'), code: 6 },
      { value: '7', label: t('status.owner'), code: 7 },
      { value: '8', label: t('status.owner'), code: 8 },
      { value: '0', label: t('status.deleted'), code: 0 },
    ]),
    [t]
  );

  const hasChanges = useMemo(() => {
    return (Object.keys(initialData) as Array<keyof UserFormState>).some(
      (key) => initialData[key] !== formData[key]
    );
  }, [formData, initialData]);

  const handleFieldChange = (field: keyof UserFormState, rawValue: string) => {
    if (field === 'status') {
      setFormData((prev) => ({ ...prev, status: rawValue }));
      return;
    }

    let value = rawValue;
    if (field === 'phone') {
      value = sanitizePhoneValue(value);
    }
    if (field === 'balance') {
      value = rawValue.replace(/\D/g, '');
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (file: File | null, _preview: string | null, data: FileData | null) => {
    const previousImage = formData.image;
    const previousFileData = imageFileData;
    if (!file) {
      setImageFileData(null);
      setFormData((prev) => ({ ...prev, image: '' }));
      return;
    }

    setUploadingImage(true);
    setImageFileData(data);

    uploadFile(file)
      .then((url) => {
        setFormData((prev) => ({ ...prev, image: url }));
        setImageFileData(data ? { ...data, preview: url, type: 'image' as const } : null);
      })
      .catch((err) => {
        setFormData((prev) => ({ ...prev, image: previousImage }));
        setImageFileData(previousFileData ?? null);
        showError(formatApiErrorMessage(err, tSystem('server_error')));
      })
      .finally(() => setUploadingImage(false));
  };

  const handleFileRemove = () => {
    setImageFileData(null);
    setFormData((prev) => ({ ...prev, image: '' }));
  };

  const handleReset = () => {
    setFormData(initialData);
    setImageFileData(null);
  };

  const handleSave = async () => {
    if (!user?.id) return;

    const payload: SaveUserRequest = { id: user.id };
    const payloadDraft = payload as Record<string, string | number | boolean | null | undefined>;
    (Object.keys(formData) as Array<keyof UserFormState>).forEach((key) => {
      if (initialData[key] !== formData[key]) {
        const value = formData[key];
        if (key === 'phone') {
          payload.phone = value ? sanitizePhoneValue(value) : null;
        } else if (key === 'balance') {
          payload.balance = value ? Number(value) : null;
        } else if (key === 'status') {
          payload.status = value ? Number(value) as UserStatus : null;
        } else {
          payloadDraft[key] = value || null;
        }
      }
    });

    const hasPayloadChanges = Object.keys(payload).some((field) => field !== 'id');
    if (!hasPayloadChanges) {
      showInfo(t('noChanges'));
      return;
    }

    setIsSaving(true);
    try {
      const updated = await saveUser(payload);
      const nextState = buildUserFormState(updated);
      setFormData(nextState);
      setInitialData(nextState);
      onSuccess(updated);
      success(t('saveSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('saveError');
      showError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const isActionDisabled = isSaving || uploadingImage;

  return (
    <div className="space-y-4">
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
          balance: t('balance.label'),
          status: t('status.label'),
          statusUnset: t('status.unset'),
        }}
        balancePlaceholder={t('balance.placeholder')}
        showAdminFields
        statusOptions={statusOptions}
      />

      <div className="flex justify-end">
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
            onClick={onCancel || handleReset}
            disabled={isActionDisabled}
          >
            {onCancel ? tSystem('cancel') : tSystem('refresh')}
          </IconButton>
        </ButtonGroup>
      </div>
    </div>
  );
}
