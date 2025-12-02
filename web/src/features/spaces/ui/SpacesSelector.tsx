'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { BuildingIcon, AddIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { getSpaces, saveSpace, type Space } from '@/entities/space';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { selectSelectedSpace, setSelectedSpace } from '../stores/spaceSelectionSlice';

interface SpacesSelectorProps {
  userId?: number;
  onCreated?: (space: Space) => void;
  onSelect?: () => void;
}

export function SpacesSelector({ userId, onCreated, onSelect }: SpacesSelectorProps) {
  const t = useTranslations('spaces.selector');
  const tSystem = useTranslations('system');
  const tEntities = useTranslations('entities');
  const router = useRouter();
  const pathname = usePathname();
  const { success, error: showError } = useToastActions();
  const dispatch = useAppDispatch();
  const selectedState = useAppSelector(selectSelectedSpace);
  const selectedLink = selectedState?.link ?? '__none__';
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const activeSpaceLink = useMemo(() => {
    const match = pathname?.match(/\/spaces\/([^/?]+)/);
    return match ? match[1] : null;
  }, [pathname]);
  const fetchKeyRef = useRef<string | null>(null);

  const loadSpaces = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await getSpaces({ attached: true });
      setSpaces(response.spaces);
    } catch (err) {
      const message = err instanceof Error ? err.message : tSystem('error');
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError, tSystem, userId]);

  useEffect(() => {
    if (!userId) return;
    const fetchKey = `spaces-${userId}`;
    if (fetchKeyRef.current === fetchKey) return;
    fetchKeyRef.current = fetchKey;
    void loadSpaces();
  }, [loadSpaces, userId]);

  useEffect(() => {
    if (activeSpaceLink && activeSpaceLink !== selectedState?.link) {
      dispatch(setSelectedSpace({ link: activeSpaceLink }));
    }
  }, [activeSpaceLink, dispatch, selectedState?.link]);

  const entityLabels = useMemo(
    () => ({
      ooo: tEntities('ooo'),
      ip: tEntities('ip'),
      fl: tEntities('fl'),
      smz: tEntities('smz'),
    }),
    [tEntities]
  );

  const handleCreateSpace = async () => {
    if (!userId) return;
    setCreating(true);
    try {
      const response = await saveSpace({ title: t('defaultTitle') });
      const newSpace = response.space;
      setSpaces((prev) => [newSpace, ...prev]);
      dispatch(setSelectedSpace({ link: newSpace.link, margin: newSpace.margin }));
      success(t('created', { title: newSpace.title }));
      onCreated?.(newSpace);
      router.push({
        pathname: '/spaces/[link]',
        params: { link: newSpace.link },
        query: { edit: '1' }
      });
      onSelect?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : tSystem('error');
      showError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleSelectSpace = (link: string) => {
    if (link === '__create__') {
      void handleCreateSpace();
      return;
    }
    if (link === '__none__') {
      dispatch(setSelectedSpace(null));
      onSelect?.();
      return;
    }

    const pickedSpace = spaces.find((item) => item.link === link);
    dispatch(setSelectedSpace({ link, margin: pickedSpace?.margin }));
    if (link) {
      router.push({ pathname: '/spaces/[link]', params: { link } });
      onSelect?.();
    }
  };

  if (!userId) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-[0.75rem] bg-muted text-muted-foreground">
            <BuildingIcon size={14} />
          </span>
          <span>{t('title')}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Select
            value={selectedLink}
            onValueChange={handleSelectSpace}
            disabled={loading}
          >
            <SelectTrigger className="h-11 rounded-[0.75rem] bg-muted border-0 px-3 cursor-pointer focus:ring-0 focus:outline-none">
              <SelectValue placeholder={loading ? tSystem('loading') : t('placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="cursor-pointer">
                {t('noSpace')}
              </SelectItem>
              <div role="separator" className="px-2 py-1">
                <div className="h-px w-full bg-border" />
              </div>
              {spaces.map((space) => (
                <SelectItem
                  key={space.id}
                  value={space.link}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{space.title}</span>
                    {space.entity ? (
                      <span className="text-xs text-muted-foreground">
                        {entityLabels[space.entity as keyof typeof entityLabels] || space.entity}
                      </span>
                    ) : null}
                  </div>
                </SelectItem>
              ))}
              <div role="separator" className="px-2 py-1">
                <div className="h-px w-full bg-border" />
              </div>
              <SelectItem value="__create__" className="cursor-pointer pl-8">
                <div className="relative flex items-center gap-2">
                  <span className="absolute left-[-22px] flex items-center justify-center">
                    <AddIcon size={14} />
                  </span>
                  <span className="pl-3">{t('create')}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
