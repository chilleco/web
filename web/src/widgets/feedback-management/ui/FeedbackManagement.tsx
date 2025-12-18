'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { API_ENDPOINTS } from '@/shared/constants';
import { apiWithoutGlobalErrors } from '@/shared/services/api/client';
import { cn } from '@/shared/lib/utils';
import { EntityManagement, EntityRow } from '@/shared/ui/entity-management';
import { Badge } from '@/shared/ui/badge';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Box } from '@/shared/ui/box';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { useToastActions } from '@/shared/hooks/useToast';
import { useApiErrorMessage } from '@/shared/hooks/useApiErrorMessage';
import type { Feedback, FeedbackType } from '@/entities/feedback';
import { getFeedback } from '@/entities/feedback';
import {
  ArrowDownIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  FeedbackIcon,
  FilterIcon,
  GlobeIcon,
  MessageIcon,
  RefreshIcon,
  ShieldIcon,
  UserIcon,
} from '@/shared/ui/icons';

type TrackObjectType =
  | 'user'
  | 'post'
  | 'product'
  | 'category'
  | 'comment'
  | 'space'
  | 'task'
  | 'feedback'
  | 'payment'
  | 'session'
  | 'system';

type TrackActionType = 'create' | 'update' | 'remove' | 'search' | 'view' | 'disconnect';

interface ActivityItem {
  id: number;
  object: TrackObjectType;
  action: TrackActionType;
  user?: number;
  token?: string;
  ip?: string;
  created: number;
  params: Record<string, unknown>;
  context: Record<string, unknown>;
}

interface AdminActivityResponse {
  items: ActivityItem[];
  count: number;
}

type FeedbackTypeOption = { value: FeedbackType | 'all'; label: string };

const formatDateTime = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const isImageUrl = (url: string) => /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(url);

const getFileNameFromUrl = (url: string) => {
  const sanitized = url.split('?')[0]?.split('#')[0] || url;
  const lastSegment = sanitized.split('/').pop() || sanitized;
  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment;
  }
};

function FeedbackFilesGallery({ files }: { files: string[] }) {
  const tSystem = useTranslations('system');
  const tFileUpload = useTranslations('fileUpload');
  const images = files.filter((file) => isImageUrl(file));
  const other = files.filter((file) => !isImageUrl(file));

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!files.length) {
    return null;
  }

  const currentImage = images[activeIndex] || images[0] || null;

  return (
    <div className="space-y-4">
      {images.length ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={() => {
                  setActiveIndex(index);
                  setIsViewerOpen(true);
                }}
                className="relative rounded-[0.75rem] overflow-hidden bg-muted cursor-pointer transition-all duration-300 ease-[cubic-bezier(0,0,0.5,1)] hover:scale-[1.01] h-32"
              >
                <Image src={url} alt="" fill sizes="(min-width: 640px) 33vw, 50vw" className="object-cover" />
              </button>
            ))}
          </div>

          <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
              <DialogHeader className="sr-only">
                <DialogTitle>{tFileUpload('preview')}</DialogTitle>
              </DialogHeader>
              <div className="bg-black/90 rounded-[1rem] overflow-hidden">
                <div className="relative w-full h-[70vh]">
                  {currentImage ? (
                    <Image
                      src={currentImage}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 80vw"
                      className="object-contain"
                    />
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-2 p-4 bg-background">
                  <div className="text-xs text-muted-foreground">
                    {images.length ? `${activeIndex + 1} / ${images.length}` : ''}
                  </div>

                  <div className="flex items-center gap-2">
                    <IconButton
                      type="button"
                      variant="outline"
                      size="icon"
                      icon={<ChevronLeftIcon size={14} />}
                      disabled={images.length < 2}
                      aria-label={tSystem('prev')}
                      onClick={() => {
                        if (images.length < 2) return;
                        setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
                      }}
                    />
                    <IconButton
                      type="button"
                      variant="outline"
                      size="icon"
                      icon={<ChevronRightIcon size={14} />}
                      disabled={images.length < 2}
                      aria-label={tSystem('next')}
                      onClick={() => {
                        if (images.length < 2) return;
                        setActiveIndex((prev) => (prev + 1) % images.length);
                      }}
                    />
                    {currentImage ? (
                      <IconButton
                        asChild
                        variant="outline"
                        size="icon"
                        icon={<ArrowDownIcon size={14} />}
                        aria-label={tSystem('download')}
                        title={tSystem('download')}
                      >
                        <a
                          href={currentImage}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="cursor-pointer"
                        />
                      </IconButton>
                    ) : null}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}

      {other.length ? (
        <div className="space-y-2">
          {other.map((url) => (
            <div
              key={url}
              className="flex items-center justify-between gap-3 rounded-[0.75rem] bg-muted px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{getFileNameFromUrl(url)}</div>
                <div className="text-xs text-muted-foreground truncate">{url}</div>
              </div>
              <IconButton
                asChild
                variant="outline"
                size="icon"
                icon={<ArrowDownIcon size={14} />}
                aria-label={tSystem('download')}
                title={tSystem('download')}
              >
                <a href={url} download target="_blank" rel="noreferrer" className="cursor-pointer" />
              </IconButton>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ActivityTimeline({
  items,
}: {
  items: ActivityItem[];
}) {
  const tDashboard = useTranslations('admin.dashboard');

  const objectLabel = useCallback(
    (object: TrackObjectType) => tDashboard(`activity.objects.${object}`),
    [tDashboard]
  );
  const actionLabel = useCallback(
    (action: TrackActionType) => tDashboard(`activity.actions.${action}`),
    [tDashboard]
  );

  const sourceLabel = useCallback(
    (source: string | undefined) => {
      if (!source) return tDashboard('activity.sources.direct');
      const key = source === 'tg_bot' ? 'tgBot' : source;
      return tDashboard(`activity.sources.${key}`);
    },
    [tDashboard]
  );

  const getVisuals = useCallback((object: TrackObjectType) => {
    switch (object) {
      case 'user':
        return {
          icon: <UserIcon size={14} />,
          accent: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
        };
      case 'post':
        return {
          icon: <MessageIcon size={14} />,
          accent: 'bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
        };
      case 'product':
        return {
          icon: <GlobeIcon size={14} />,
          accent: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
        };
      case 'feedback':
        return {
          icon: <FeedbackIcon size={14} />,
          accent: 'bg-teal-500/15 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400',
        };
      default:
        return {
          icon: <ShieldIcon size={14} />,
          accent: 'bg-muted text-muted-foreground',
        };
    }
  }, []);

  if (!items.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const visuals = getVisuals(item.object);
        const source = typeof item.context?.source === 'string' ? item.context.source : undefined;

        return (
          <div key={item.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-[0.75rem] flex items-center justify-center',
                  visuals.accent
                )}
              >
                {visuals.icon}
              </div>
              {index < items.length - 1 ? (
                <div className="w-px flex-1 bg-muted mt-1" />
              ) : null}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">
                  {objectLabel(item.object)} · {actionLabel(item.action)}
                </span>
                <span className="text-xs text-muted-foreground">{formatDateTime(item.created)}</span>
              </div>
              <div className="text-xs text-muted-foreground">{sourceLabel(source)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FeedbackDetailsDialog({
  feedback,
  onOpenChange,
}: {
  feedback: Feedback;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('admin.feedback');
  const tSystem = useTranslations('system');
  const { error: showError } = useToastActions();
  const formatApiErrorMessage = useApiErrorMessage();

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const activityKeyRef = useRef<string | null>(null);
  const activityFetchingRef = useRef(false);

  const createdLabel = useMemo(() => formatDateTime(feedback.created), [feedback.created]);

  const fetchActivity = useCallback(async () => {
    const now = Math.floor(Date.now() / 1000);
    const dateFrom = now - 24 * 60 * 60;
    const hasUser = typeof feedback.user === 'number' && feedback.user > 0;
    const token = feedback.token || undefined;

    const key = `${feedback.id}-${hasUser ? `u:${feedback.user}` : `t:${token || ''}`}-${dateFrom}`;
    if (activityKeyRef.current === key) return;
    if (activityFetchingRef.current) return;
    activityKeyRef.current = key;
    activityFetchingRef.current = true;

    setActivityLoading(true);
    try {
      const payload = {
        user: hasUser ? feedback.user : undefined,
        token: !hasUser ? token : undefined,
        date_from: dateFrom,
        limit: 50,
        offset: 0,
      };
      const response = await apiWithoutGlobalErrors.post<AdminActivityResponse>(
        API_ENDPOINTS.ADMIN.ACTIVITY,
        payload
      );
      setActivity(response.items || []);
    } catch (err) {
      showError(formatApiErrorMessage(err, tSystem('server_error')));
    } finally {
      setActivityLoading(false);
      activityFetchingRef.current = false;
    }
  }, [feedback.id, feedback.token, feedback.user, formatApiErrorMessage, showError, tSystem]);

  useEffect(() => {
    void fetchActivity();
  }, [fetchActivity]);

  const metaItems = useMemo(
    () => [
      { icon: <GlobeIcon size={12} />, keyLabel: t('fields.source'), value: feedback.source || tSystem('none') },
      { icon: <MessageIcon size={12} />, keyLabel: t('fields.type'), value: String(feedback.type || tSystem('none')) },
      { icon: <CalendarIcon size={12} />, keyLabel: t('fields.created'), value: createdLabel || tSystem('none') },
      { icon: <UserIcon size={12} />, keyLabel: t('fields.user'), value: feedback.user ? `#${feedback.user}` : tSystem('guest') },
      { icon: <ShieldIcon size={12} />, keyLabel: t('fields.userStatus'), value: feedback.user_status ?? tSystem('none') },
      { icon: <ClockIcon size={12} />, keyLabel: t('fields.network'), value: feedback.network ?? tSystem('none') },
    ],
    [
      createdLabel,
      feedback.network,
      feedback.source,
      feedback.type,
      feedback.user,
      feedback.user_status,
      t,
      tSystem,
    ]
  );

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('detailsTitle', { id: feedback.id })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Box variant="muted" className="space-y-4">
            <div className="text-sm font-semibold text-foreground">{t('detailsMeta')}</div>
            <div className="flex flex-wrap gap-2">
              {metaItems.map((item) => (
                <span
                  key={item.keyLabel}
                  className="inline-flex items-center gap-2 rounded-[0.75rem] bg-background/60 px-2 py-1 text-xs text-foreground"
                  title={item.keyLabel}
                >
                  {item.icon}
                  <span className="truncate">{item.value}</span>
                </span>
              ))}
            </div>

            {feedback.token ? (
              <div className="rounded-[0.75rem] bg-background/60 px-3 py-2 text-xs text-muted-foreground break-all">
                <span className="font-semibold text-foreground">{t('fields.token')}: </span>
                {feedback.token}
              </div>
            ) : null}
          </Box>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">{t('detailsMessage')}</div>
            <Textarea value={feedback.data || ''} readOnly rows={8} className="resize-none" />
          </div>

          {feedback.files?.length ? (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-foreground">{t('detailsFiles')}</div>
              <FeedbackFilesGallery files={feedback.files} />
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-foreground">{t('detailsTimeline')}</div>
              <IconButton
                type="button"
                variant="outline"
                icon={<RefreshIcon size={14} />}
                responsive
                onClick={() => {
                  activityKeyRef.current = null;
                  void fetchActivity();
                }}
              >
                {tSystem('refresh')}
              </IconButton>
            </div>

            {activityLoading ? (
              <div className="text-sm text-muted-foreground">{tSystem('loading')}</div>
            ) : activity.length ? (
              <ActivityTimeline items={activity} />
            ) : (
              <div className="text-sm text-muted-foreground">{t('timelineEmpty')}</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface FeedbackManagementProps {
  triggerRefresh?: number;
}

export function FeedbackManagement({ triggerRefresh }: FeedbackManagementProps) {
  const t = useTranslations('admin.feedback');
  const tSystem = useTranslations('system');
  const { error: showError } = useToastActions();
  const formatApiErrorMessage = useApiErrorMessage();

  const [items, setItems] = useState<Feedback[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all');
  const [selected, setSelected] = useState<Feedback | null>(null);

  const listFetchKeyRef = useRef<string | null>(null);
  const listFetchingRef = useRef(false);

  const typeOptions = useMemo<FeedbackTypeOption[]>(
    () => [
      { value: 'all', label: t('filters.typeAll') },
      { value: 'question', label: t('types.question') },
      { value: 'bug', label: t('types.bug') },
      { value: 'request', label: t('types.request') },
      { value: 'improve', label: t('types.improve') },
    ],
    [t]
  );

  const loadFeedback = useCallback(async () => {
    const key = JSON.stringify({ search, type: typeFilter });
    if (listFetchKeyRef.current === key) return;
    if (listFetchingRef.current) return;

    listFetchKeyRef.current = key;
    listFetchingRef.current = true;

    setLoading(true);
    setError(null);

    try {
      const response = await getFeedback({
        limit: 100,
        offset: 0,
        search: search || undefined,
        type: typeFilter === 'all' ? undefined : typeFilter,
      });
      setItems(response.feedback || []);
      setCount(response.count ?? null);
    } catch (err) {
      const message = formatApiErrorMessage(err, tSystem('server_error'));
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
      listFetchingRef.current = false;
    }
  }, [formatApiErrorMessage, search, showError, tSystem, typeFilter]);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  useEffect(() => {
    if (!triggerRefresh) return;
    listFetchKeyRef.current = null;
    void loadFeedback();
  }, [loadFeedback, triggerRefresh]);

  const rows = useMemo(() => {
    return items;
  }, [items]);

  return (
    <>
      <EntityManagement
        loading={loading}
        error={error}
        isEmpty={!rows.length}
        loadingLabel={t('loading')}
        emptyLabel={t('empty')}
        renderList={() => (
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-between px-2 pt-2">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="relative w-full sm:max-w-sm">
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t('filters.searchPlaceholder')}
                    className="pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <FilterIcon size={14} />
                  </div>
                </div>

                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as FeedbackType | 'all')}>
                  <SelectTrigger className="cursor-pointer sm:w-56">
                    <SelectValue placeholder={t('filters.type')} />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <IconButton
                type="button"
                variant="outline"
                icon={<RefreshIcon size={14} />}
                responsive
                onClick={() => {
                  listFetchKeyRef.current = null;
                  void loadFeedback();
                }}
              >
                {tSystem('refresh')}
              </IconButton>
            </div>

            <div className="divide-y divide-border/50 px-2">
              {rows.map((item) => {
                const badgeVariant =
                  item.type === 'bug' ? 'destructive' : item.type === 'request' ? 'secondary' : 'default';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    aria-label={t('actions.open')}
                    className="block w-full py-3 text-left cursor-pointer rounded-[0.75rem] transition-all duration-300 ease-[cubic-bezier(0,0,0.5,1)] hover:bg-muted/40 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <EntityRow
                      id={item.id}
                      title={item.title || t('fallbackTitle', { id: item.id })}
                      badges={[
                        <Badge key="type" variant={badgeVariant} className={badgeVariant === 'destructive' ? 'text-white' : undefined}>
                          {String(item.type || tSystem('none'))}
                        </Badge>,
                      ]}
                      leftSlot={
                        <div className="w-10 h-10 rounded-[0.75rem] bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                          <FeedbackIcon size={16} />
                        </div>
                      }
                      secondRowItems={[
                        { icon: <GlobeIcon size={12} />, keyLabel: t('fields.source'), value: item.source || tSystem('none') },
                        { icon: <ClockIcon size={12} />, keyLabel: t('fields.created'), value: formatDateTime(item.created) || tSystem('none') },
                        { icon: <UserIcon size={12} />, keyLabel: t('fields.user'), value: item.user ? `#${item.user}` : tSystem('guest') },
                      ]}
                      rightActions={
                        <div className="text-muted-foreground">
                          <ChevronRightIcon size={14} />
                        </div>
                      }
                    />
                  </button>
                );
              })}
            </div>

            {count !== null ? (
              <div className="px-4 pb-4 text-sm text-muted-foreground">{t('countLabel', { count })}</div>
            ) : null}
          </div>
        )}
      />

      {selected ? (
        <FeedbackDetailsDialog
          feedback={selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        />
      ) : null}
    </>
  );
}
