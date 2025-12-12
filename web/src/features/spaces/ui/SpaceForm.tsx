'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { IconButton } from '@/shared/ui/icon-button';
import { ButtonGroup } from '@/shared/ui/button-group';
import { FileUpload, type FileData } from '@/shared/ui/file-upload';
import {
  SaveIcon,
  CloseIcon,
  BuildingIcon,
  PhoneIcon,
  MailIcon,
  TelegramIcon,
  LocationIcon
} from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { useApiErrorMessage } from '@/shared/hooks/useApiErrorMessage';
import { uploadFile } from '@/shared/services/api/upload';
import { saveSpace, type Space, type SpaceEntityType } from '@/entities/space';

const inlineRowClass =
  'flex h-12 items-center rounded-[0.75rem] bg-muted text-base text-foreground overflow-hidden';
const inlineLabelClass =
  'h-full px-3 flex items-center justify-center border-r border-border/60 bg-muted text-muted-foreground';
const inlineSuffixClass =
  'h-full px-3 flex items-center justify-center border-l border-border/60 bg-muted text-muted-foreground';
const inlineInputClass =
  'bg-muted border-0 text-base text-foreground rounded-none shadow-none focus:ring-0 focus:outline-none h-full w-full placeholder:text-muted-foreground';

interface SpaceFormProps {
  space?: Space;
  onSaved?: (space: Space) => void;
  onCancel?: () => void;
}

interface SpaceFormState {
  title: string;
  description: string;
  entity: SpaceEntityType | '';
  director: string;
  inn: string;
  margin: string;
  phone: string;
  mail: string;
  telegram: string;
  country: string;
  region: string;
  city: string;
}

const defaultState: SpaceFormState = {
  title: '',
  description: '',
  entity: '',
  director: '',
  inn: '',
  margin: '0',
  phone: '',
  mail: '',
  telegram: '',
  country: '',
  region: '',
  city: ''
};

export function SpaceForm({ space, onSaved, onCancel }: SpaceFormProps) {
  const t = useTranslations('spaces.form');
  const tSystem = useTranslations('system');
  const { success, error: showError } = useToastActions();
  const formatApiErrorMessage = useApiErrorMessage();
  const [form, setForm] = useState<SpaceFormState>(defaultState);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoFile, setLogoFile] = useState<FileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (!space) {
      setForm(defaultState);
      setLogoUrl('');
      setLogoFile(null);
      return;
    }

    setForm({
      title: space.title || '',
      description: space.description || '',
      entity: space.entity || '',
      director: space.director || '',
      inn: space.inn || '',
      margin: typeof space.margin === 'number' ? String(space.margin) : '0',
      phone: space.phone || '',
      mail: space.mail || '',
      telegram: space.telegram || '',
      country: space.country || '',
      region: space.region || '',
      city: space.city || ''
    });
    setLogoUrl(space.logo || '');
    setLogoFile(
      space.logo
        ? {
          file: undefined as unknown as File,
          preview: space.logo,
          type: 'image',
          icon: undefined
        }
        : null
    );
  }, [space]);

  const tEntities = useTranslations('entities');
  const entityOptions = useMemo(
    () => [
      { value: 'ooo', label: tEntities('ooo') },
      { value: 'ip', label: tEntities('ip') },
      { value: 'fl', label: tEntities('fl') },
      { value: 'smz', label: tEntities('smz') }
    ],
    [tEntities]
  );

  const handleChange = <K extends keyof SpaceFormState>(key: K, value: SpaceFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoChange = async (file: File | null, _preview: string | null, fileData: FileData | null) => {
    const previousLogoUrl = logoUrl;
    const previousFileData = logoFile;
    setLogoFile(fileData);

    if (!file) {
      setLogoUrl('');
      return;
    }

    setUploadingLogo(true);
    try {
      const url = await uploadFile(file);
      setLogoUrl(url);
      success(t('logoUploaded'));
    } catch (err) {
      setLogoFile(previousFileData);
      setLogoUrl(previousLogoUrl);
      showError(formatApiErrorMessage(err, tSystem('server_error')));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || uploadingLogo) return;

    setSaving(true);
    try {
      const parsedMargin = Number.parseFloat(form.margin || '0');

      const payload = {
        id: space?.id,
        link: space?.link,
        title: form.title.trim(),
        logo: logoUrl || null,
        description: form.description.trim(),
        entity: (form.entity || null) as SpaceEntityType | null,
        director: form.director.trim() || null,
        inn: form.inn.trim() || null,
        margin: Number.isFinite(parsedMargin) ? parsedMargin : 0,
        phone: form.phone.trim() || null,
        mail: form.mail.trim() || null,
        telegram: form.telegram.trim() || null,
        country: form.country.trim() || null,
        region: form.region.trim() || null,
        city: form.city.trim() || null
      };

      const response = await saveSpace(payload);
      success(t('saved'));
      onSaved?.(response.space);
    } catch (err) {
      const message = err instanceof Error ? err.message : tSystem('error');
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={inlineRowClass}>
        <Input
          value={form.title}
          onChange={(event) => handleChange('title', event.target.value)}
          placeholder={t('titlePlaceholder')}
          className={inlineInputClass}
          required
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
        <div className="space-y-2 flex flex-col">
          <p className="text-sm text-muted-foreground">{t('logo')}</p>
          <div className="flex-1">
            <FileUpload
              value={logoUrl}
              fileData={logoFile || undefined}
              onFileChange={handleLogoChange}
              onFileRemove={() => {
                setLogoUrl('');
                setLogoFile(null);
              }}
              // label={t('logoPlaceholder')}
              height={420}
              width="w-full h-full"
              disabled={uploadingLogo}
              fileTypes="images"
              showHints={false}
              className="cursor-pointer h-full"
            />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-3 flex flex-col">
          <div className={inlineRowClass}>
            <span className={inlineLabelClass}>{t('entity')}</span>
            <Select
              value={form.entity}
              onValueChange={(value) => handleChange('entity', value as SpaceEntityType | '')}
            >
              <SelectTrigger className="h-12 rounded-none rounded-r-[0.75rem] bg-muted border-0 px-3 cursor-pointer focus:ring-0 focus:outline-none">
                <SelectValue placeholder={t('entityPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {entityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className={inlineRowClass}>
              <span className={inlineLabelClass}>{t('director')}</span>
              <Input
                value={form.director}
                onChange={(event) => handleChange('director', event.target.value)}
                placeholder={t('directorPlaceholder')}
                className={inlineInputClass}
              />
            </div>
            <div className={inlineRowClass}>
              <span className={inlineLabelClass}>{t('inn')}</span>
              <Input
                value={form.inn}
                onChange={(event) => handleChange('inn', event.target.value)}
                placeholder={t('innPlaceholder')}
                className={inlineInputClass}
              />
            </div>
          </div>

          <div className={inlineRowClass}>
            <span className={inlineLabelClass}>{t('margin')}</span>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              value={form.margin}
              onChange={(event) => {
                const next = event.target.value.replace(/[^0-9]/g, '');
                handleChange('margin', next);
              }}
              placeholder={t('marginPlaceholder')}
              className={inlineInputClass}
            />
            <span className={inlineSuffixClass}>%</span>
          </div>

          <Textarea
            value={form.description}
            onChange={(event) => handleChange('description', event.target.value)}
            placeholder={t('descriptionPlaceholder')}
            className="bg-muted border-0 rounded-[0.75rem] min-h-[140px] text-base"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span className="flex h-8 w-8 items-center justify-center rounded-[0.75rem] bg-muted">
            <MailIcon size={14} />
          </span>
          <span>{t('contactTitle')}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className={inlineRowClass}>
            <span className={inlineLabelClass}>
              <PhoneIcon size={14} className="text-muted-foreground" />
            </span>
            <Input
              value={form.phone}
              onChange={(event) => handleChange('phone', event.target.value)}
              placeholder={t('phonePlaceholder')}
              className={inlineInputClass}
            />
          </div>
          <div className={inlineRowClass}>
            <span className={inlineLabelClass}>
              <MailIcon size={14} className="text-muted-foreground" />
            </span>
            <Input
              value={form.mail}
              onChange={(event) => handleChange('mail', event.target.value)}
              placeholder={t('mailPlaceholder')}
              className={inlineInputClass}
            />
          </div>
          <div className={inlineRowClass}>
            <span className={inlineLabelClass}>
              <TelegramIcon size={14} className="text-muted-foreground" />
            </span>
            <Input
              value={form.telegram}
              onChange={(event) => handleChange('telegram', event.target.value)}
              placeholder={t('telegramPlaceholder')}
              className={inlineInputClass}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span className="flex h-8 w-8 items-center justify-center rounded-[0.75rem] bg-muted">
            <LocationIcon size={14} />
          </span>
          <span>{t('region')}</span>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:gap-0 md:h-12 md:items-stretch md:rounded-[0.75rem] md:bg-muted md:overflow-hidden">
          <Input
            value={form.country}
            onChange={(event) => handleChange('country', event.target.value)}
            placeholder={t('countryPlaceholder')}
            className="bg-muted border-0 rounded-[0.75rem] shadow-none focus:ring-0 focus:outline-none h-12 md:h-full md:rounded-none md:placeholder:text-muted-foreground md:border-r md:border-border/60"
          />
          <Input
            value={form.region}
            onChange={(event) => handleChange('region', event.target.value)}
            placeholder={t('regionPlaceholder')}
            className="bg-muted border-0 rounded-[0.75rem] shadow-none focus:ring-0 focus:outline-none h-12 md:h-full md:rounded-none md:placeholder:text-muted-foreground md:border-r md:border-border/60"
          />
          <Input
            value={form.city}
            onChange={(event) => handleChange('city', event.target.value)}
            placeholder={t('cityPlaceholder')}
            className="bg-muted border-0 rounded-[0.75rem] shadow-none focus:ring-0 focus:outline-none h-12 md:h-full md:rounded-none md:placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <ButtonGroup>
          <IconButton
            type="submit"
            icon={<SaveIcon size={14} />}
            responsive
            disabled={saving || uploadingLogo}
          >
            {saving ? tSystem('loading') : tSystem('save')}
          </IconButton>
          {onCancel ? (
            <IconButton
              type="button"
              variant="ghost"
              icon={<CloseIcon size={14} />}
              responsive
              onClick={onCancel}
            >
              {tSystem('cancel')}
            </IconButton>
          ) : null}
        </ButtonGroup>
      </div>
    </form>
  );
}
