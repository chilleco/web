'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { IconButton } from '@/shared/ui/icon-button';
import { ButtonGroup } from '@/shared/ui/button-group';
import { Label } from '@/shared/ui/label';
import { IconKeyInput } from '@/shared/ui/icon-key-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { CancelIcon, CoinsIcon, LoadingIcon, SaveIcon } from '@/shared/ui/icons';
import { NETWORK_KEYS } from '@/shared/lib/codes';
import { cn } from '@/shared/lib/utils';
import { useToastActions } from '@/shared/hooks/useToast';
import { useApiErrorMessage } from '@/shared/hooks/useApiErrorMessage';
import type { LocalizedText, Task, TaskColor, TaskSaveRequest } from '@/entities/task/model/task';
import { saveTask } from '@/entities/task/api/tasks';

const LOCALES = ['en', 'ru', 'es', 'zh', 'ar'] as const;
type LocaleKey = (typeof LOCALES)[number];

type LocalizedState = Record<LocaleKey, string>;
type NetworkSelection = 'all' | (typeof NETWORK_KEYS)[number];

const toLocalizedState = (value?: LocalizedText): LocalizedState => {
  const result = {} as LocalizedState;
  LOCALES.forEach((locale) => {
    result[locale] = value?.[locale] ?? '';
  });
  return result;
};

const toLocalizedPayload = (state: LocalizedState): LocalizedText | undefined => {
  const payload: LocalizedText = {};
  LOCALES.forEach((locale) => {
    const text = state[locale].trim();
    if (text) {
      payload[locale] = text;
    }
  });
  return Object.keys(payload).length ? payload : undefined;
};

const parseOptionalInt = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.trunc(parsed);
};

const normalizeString = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : '';
};

const FONT_AWESOME_STYLE_TOKENS = new Set([
  'fa-solid',
  'fa-regular',
  'fa-brands',
  'fa-light',
  'fa-thin',
  'fa-duotone',
  'fa-sharp',
  'fa-sharp-solid',
  'fa-sharp-regular',
  'fa-sharp-light',
  'fa-sharp-thin',
  'fa-sharp-duotone',
  'fas',
  'far',
  'fab',
]);

const normalizeIconKey = (value: string) => {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return '';

  const faToken = [...tokens]
    .reverse()
    .find((token) => token.startsWith('fa-') && !FONT_AWESOME_STYLE_TOKENS.has(token));

  const candidate = faToken ?? tokens[tokens.length - 1];
  const rawKey = candidate.startsWith('fa-') ? candidate.slice(3) : candidate;
  return rawKey.toLowerCase().replace(/[^a-z0-9-]/g, '');
};

const toNetworkSelection = (value?: string | null): NetworkSelection => {
  if (typeof value !== 'string') return 'all';
  const normalized = value.trim();
  if (!normalized) return 'all';
  return (NETWORK_KEYS.includes(normalized as (typeof NETWORK_KEYS)[number]) ? normalized : 'all') as NetworkSelection;
};

interface TaskFormProps {
  task?: Task;
  onSuccess: () => void;
  onCancel: () => void;
}

type ApiErrorField = 'title' | 'verify' | 'reward' | 'priority' | 'link' | 'icon' | 'color' | 'params' | 'expired' | 'status' | 'network';

export function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
  const t = useTranslations('admin.tasks');
  const tSystem = useTranslations('system');
  const { success: showSuccess, error: showError } = useToastActions();
  const formatApiErrorMessage = useApiErrorMessage();

  const [saving, setSaving] = useState(false);
  const [apiErrorField, setApiErrorField] = useState<ApiErrorField | null>(null);

  const [title, setTitle] = useState<LocalizedState>(() => toLocalizedState(task?.title));
  const [data, setData] = useState<LocalizedState>(() => toLocalizedState(task?.data));
  const [button, setButton] = useState<LocalizedState>(() => toLocalizedState(task?.button));
  const [link, setLink] = useState(task?.link ?? '');
  const [icon, setIcon] = useState(() => normalizeIconKey(task?.icon ?? ''));
  const [color, setColor] = useState<TaskColor>((task?.color as TaskColor) ?? 'green');
  const [reward, setReward] = useState(task?.reward !== undefined && task?.reward !== null ? String(task.reward) : '');
  const [priority, setPriority] = useState(task?.priority !== undefined && task?.priority !== null ? String(task.priority) : '');
  const [expired, setExpired] = useState(task?.expired !== undefined && task?.expired !== null ? String(task.expired) : '');
  const [status, setStatus] = useState(task?.status === 0 ? '0' : '1');
  const [verify, setVerify] = useState(task?.verify ?? 'simple');
  const [paramsJson, setParamsJson] = useState(() => (task?.params ? JSON.stringify(task.params, null, 2) : ''));
  const [network, setNetwork] = useState<NetworkSelection>(() => toNetworkSelection(task?.network));

  useEffect(() => {
    setTitle(toLocalizedState(task?.title));
    setData(toLocalizedState(task?.data));
    setButton(toLocalizedState(task?.button));
    setLink(task?.link ?? '');
    setIcon(normalizeIconKey(task?.icon ?? ''));
    setColor((task?.color as TaskColor) ?? 'green');
    setReward(task?.reward !== undefined && task?.reward !== null ? String(task.reward) : '');
    setPriority(task?.priority !== undefined && task?.priority !== null ? String(task.priority) : '');
    setExpired(task?.expired !== undefined && task?.expired !== null ? String(task.expired) : '');
    setStatus(task?.status === 0 ? '0' : '1');
    setVerify(task?.verify ?? 'simple');
    setParamsJson(task?.params ? JSON.stringify(task.params, null, 2) : '');
    setNetwork(toNetworkSelection(task?.network));
    setApiErrorField(null);
  }, [task]);

  const titlePayload = useMemo(() => toLocalizedPayload(title), [title]);
  const dataPayload = useMemo(() => toLocalizedPayload(data), [data]);
  const buttonPayload = useMemo(() => toLocalizedPayload(button), [button]);
  const networkOptions = useMemo(
    () => [
      { value: 'all', label: tSystem('networks.all') },
      ...NETWORK_KEYS.map((key) => ({
        value: key,
        label: tSystem(`networks.${key}`),
      })),
    ],
    [tSystem]
  );

  const handleSubmit = async () => {
    setApiErrorField(null);

    if (!title.en.trim()) {
      setApiErrorField('title');
      showError(t('errors.title'));
      return;
    }

    if (!verify.trim()) {
      setApiErrorField('verify');
      showError(t('errors.verify'));
      return;
    }

    const payload: TaskSaveRequest = {
      ...(task?.id ? { id: task.id } : {}),
      title: titlePayload,
      data: dataPayload,
      button: buttonPayload,
      link: normalizeString(link) || undefined,
      icon: normalizeIconKey(icon) || undefined,
      color: (normalizeString(String(color)) as TaskColor) || undefined,
      reward: parseOptionalInt(reward),
      priority: parseOptionalInt(priority),
      expired: parseOptionalInt(expired),
      status: parseOptionalInt(status),
      verify: normalizeString(verify) || undefined,
      network: network === 'all' ? '' : network,
    };

    const paramsText = paramsJson.trim();
    if (paramsText) {
      try {
        const parsed = JSON.parse(paramsText);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          setApiErrorField('params');
          showError(t('errors.params'));
          return;
        }
        payload.params = parsed as Record<string, unknown>;
      } catch {
        setApiErrorField('params');
        showError(t('errors.params'));
        return;
      }
    }

    setSaving(true);
    try {
      await saveTask(payload as TaskSaveRequest);
      showSuccess(task ? t('actions.updateSuccess') : t('actions.createSuccess'));
      onSuccess();
    } catch (err) {
      const message = formatApiErrorMessage(err, tSystem('server_error'));
      const detail = (err && typeof err === 'object' && 'data' in err) ? (err as { data?: { detail?: unknown } }).data?.detail : null;
      const detailKey = typeof detail === 'string' ? detail : '';
      const nextField: ApiErrorField | null = detailKey.includes('title') ? 'title'
        : detailKey.includes('verify') ? 'verify'
        : detailKey.includes('chat_id') || detailKey.includes('count') || detailKey.includes('params') ? 'params'
        : detailKey.includes('network') ? 'network'
        : null;
      setApiErrorField(nextField);
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('fields.title')}*</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {LOCALES.map((locale) => (
              <div key={locale} className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase">{locale}</div>
                <Input
                  value={title[locale]}
                  onChange={(e) => setTitle((prev) => ({ ...prev, [locale]: e.target.value }))}
                  placeholder={t('placeholders.title', { locale })}
                  aria-invalid={apiErrorField === 'title' && locale === 'en'}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t('fields.verify')}*</Label>
            <Select value={verify} onValueChange={setVerify}>
              <SelectTrigger className={cn('cursor-pointer', apiErrorField === 'verify' ? 'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40' : '')} aria-invalid={apiErrorField === 'verify'}>
                <SelectValue placeholder={t('placeholders.verify')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple" className="cursor-pointer">{t('verify.simple')}</SelectItem>
                <SelectItem value="channel" className="cursor-pointer">{t('verify.channel')}</SelectItem>
                <SelectItem value="invite" className="cursor-pointer">{t('verify.invite')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('fields.status')}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t('placeholders.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1" className="cursor-pointer">{t('status.active')}</SelectItem>
                <SelectItem value="0" className="cursor-pointer">{t('status.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{tSystem('network')}</Label>
            <Select value={network} onValueChange={(value) => setNetwork(value as NetworkSelection)}>
              <SelectTrigger className={cn('cursor-pointer', apiErrorField === 'network' ? 'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40' : '')} aria-invalid={apiErrorField === 'network'}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {networkOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('fields.reward')}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder={t('placeholders.reward')}
                aria-invalid={apiErrorField === 'reward'}
              />
              <div className="shrink-0 text-muted-foreground">
                <CoinsIcon size={16} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('fields.priority')}</Label>
            <Input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              placeholder={t('placeholders.priority')}
              aria-invalid={apiErrorField === 'priority'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('fields.color')}</Label>
            <Select value={String(color)} onValueChange={(value) => setColor(value as TaskColor)}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t('placeholders.color')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="green" className="cursor-pointer">{t('colors.green')}</SelectItem>
                <SelectItem value="violet" className="cursor-pointer">{t('colors.violet')}</SelectItem>
                <SelectItem value="blue" className="cursor-pointer">{t('colors.blue')}</SelectItem>
                <SelectItem value="orange" className="cursor-pointer">{t('colors.orange')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('fields.expired')}</Label>
            <Input
              type="number"
              value={expired}
              onChange={(e) => setExpired(e.target.value)}
              placeholder={t('placeholders.expired')}
              aria-invalid={apiErrorField === 'expired'}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('fields.link')}</Label>
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder={t('placeholders.link')}
            aria-invalid={apiErrorField === 'link'}
          />
          <p className="text-xs text-muted-foreground">{t('hints.link')}</p>
        </div>

        <IconKeyInput
          inputProps={{
            value: icon,
            onChange: (e) => setIcon(e.target.value),
            onBlur: (e) => setIcon(normalizeIconKey(e.target.value)),
            'aria-invalid': apiErrorField === 'icon',
          }}
        />

        <div className="space-y-2">
          <Label>{t('fields.params')}</Label>
          <Textarea
            value={paramsJson}
            onChange={(e) => setParamsJson(e.target.value)}
            placeholder={t('placeholders.params')}
            className={cn('min-h-[120px]', apiErrorField === 'params' ? 'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40' : '')}
            aria-invalid={apiErrorField === 'params'}
          />
          <p className="text-xs text-muted-foreground">{t('hints.params')}</p>
        </div>

        <div className="space-y-2">
          <Label>{t('fields.data')}</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {LOCALES.map((locale) => (
              <div key={locale} className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase">{locale}</div>
                <Textarea
                  value={data[locale]}
                  onChange={(e) => setData((prev) => ({ ...prev, [locale]: e.target.value }))}
                  placeholder={t('placeholders.data', { locale })}
                  className="min-h-[84px]"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('fields.button')}</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {LOCALES.map((locale) => (
              <div key={locale} className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase">{locale}</div>
                <Input
                  value={button[locale]}
                  onChange={(e) => setButton((prev) => ({ ...prev, [locale]: e.target.value }))}
                  placeholder={t('placeholders.button', { locale })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <ButtonGroup>
          <IconButton
            variant="outline"
            icon={<CancelIcon size={14} />}
            onClick={onCancel}
            responsive
            disabled={saving}
          >
            {tSystem('cancel')}
          </IconButton>
          <IconButton
            icon={saving ? <LoadingIcon size={14} className="animate-spin" /> : <SaveIcon size={14} />}
            onClick={handleSubmit}
            responsive
            disabled={saving}
          >
            {saving ? tSystem('saving') : tSystem('save')}
          </IconButton>
        </ButtonGroup>
      </div>
    </div>
  );
}
