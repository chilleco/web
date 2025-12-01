'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { BuildingIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { getSpaces, saveSpace, type Space } from '@/entities/space';

interface SpacesSelectorProps {
  userId?: number;
  onCreated?: (space: Space) => void;
}

export function SpacesSelector({ userId, onCreated }: SpacesSelectorProps) {
  const t = useTranslations('spaces.selector');
  const tSystem = useTranslations('system');
  const router = useRouter();
  const { success, error: showError } = useToastActions();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedLink, setSelectedLink] = useState<string>('');
  const fetchKeyRef = useRef<string | null>(null);

  const loadSpaces = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await getSpaces({ attached: true });
      setSpaces(response.spaces);
      if (response.spaces.length && !selectedLink) {
        setSelectedLink(response.spaces[0].link);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : tSystem('error');
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedLink, showError, tSystem, userId]);

  useEffect(() => {
    if (!userId) return;
    const fetchKey = `spaces-${userId}`;
    if (fetchKeyRef.current === fetchKey) return;
    fetchKeyRef.current = fetchKey;
    void loadSpaces();
  }, [loadSpaces, userId]);

  const entityLabels = useMemo(
    () => ({
      ooo: t('entities.ooo'),
      ip: t('entities.ip'),
      fl: t('entities.fl'),
      smz: t('entities.smz')
    }),
    [t]
  );

  const handleCreateSpace = async () => {
    if (!userId) return;
    setCreating(true);
    try {
      const response = await saveSpace({ title: t('defaultTitle') });
      const newSpace = response.space;
      setSpaces((prev) => [newSpace, ...prev]);
      setSelectedLink(newSpace.link);
      success(t('created', { title: newSpace.title }));
      onCreated?.(newSpace);
      router.push(`/spaces/${newSpace.link}?edit=1`);
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
    setSelectedLink(link);
    router.push(`/spaces/${link}`);
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
            value={selectedLink || undefined}
            onValueChange={handleSelectSpace}
            disabled={loading}
          >
            <SelectTrigger className="h-11 rounded-[0.75rem] bg-muted border-0 px-3 cursor-pointer focus:ring-0 focus:outline-none">
              <SelectValue placeholder={loading ? t('loading') : t('placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__create__" className="cursor-pointer">
                {t('create')}
              </SelectItem>
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
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
