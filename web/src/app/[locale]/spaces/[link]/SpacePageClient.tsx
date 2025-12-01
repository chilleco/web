'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/shared/ui/page-header';
import { Box } from '@/shared/ui/box';
import { IconButton } from '@/shared/ui/icon-button';
import { BuildingIcon, RefreshIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { getSpaceByLink, type Space } from '@/entities/space';
import { SpaceForm } from '@/features/spaces';

interface SpacePageClientProps {
  link: string;
}

export function SpacePageClient({ link }: SpacePageClientProps) {
  const t = useTranslations('spaces.page');
  const tSystem = useTranslations('system');
  const { error: showError } = useToastActions();
  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchKeyRef = useRef<string | null>(null);

  const loadSpace = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSpaceByLink(link);
      setSpace(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : tSystem('error');
      showError(message);
      setSpace(null);
    } finally {
      setLoading(false);
    }
  }, [link, showError, tSystem]);

  useEffect(() => {
    const fetchKey = `space-${link}`;
    if (fetchKeyRef.current === fetchKey) return;
    fetchKeyRef.current = fetchKey;
    void loadSpace();
  }, [link, loadSpace]);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<BuildingIcon size={24} />}
        iconClassName="bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
        title={space?.title || t('title')}
        description={t('description')}
        actions={
          <IconButton
            icon={<RefreshIcon size={14} />}
            variant="ghost"
            onClick={loadSpace}
            responsive
          >
            {t('refresh')}
          </IconButton>
        }
      />

      <Box>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            {t('loading')}
          </div>
        ) : space ? (
          <SpaceForm space={space} onSaved={setSpace} />
        ) : (
          <div className="py-10 text-center text-muted-foreground">{t('notFound')}</div>
        )}
      </Box>
    </div>
  );
}
