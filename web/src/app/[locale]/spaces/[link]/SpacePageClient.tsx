'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/shared/ui/page-header';
import { Box } from '@/shared/ui/box';
import { IconButton } from '@/shared/ui/icon-button';
import { ButtonGroup } from '@/shared/ui/button-group';
import { BuildingIcon, RefreshIcon, DeleteIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { deleteSpace, getSpaceByLink, type Space } from '@/entities/space';
import { SpaceForm } from '@/features/spaces';
import { useRouter } from '@/i18n/routing';
import { useAppSelector } from '@/shared/stores/store';
import { selectSelectedSpace } from '@/features/spaces/stores/spaceSelectionSlice';

interface SpacePageClientProps {
  link: string;
}

export function SpacePageClient({ link }: SpacePageClientProps) {
  const t = useTranslations('spaces.page');
  const tSystem = useTranslations('system');
  const { error: showError, success: showSuccess } = useToastActions();
  const router = useRouter();
  const selectedSpace = useAppSelector(selectSelectedSpace);
  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const fetchKeyRef = useRef<string | null>(null);
  const selectionRef = useRef<string | null | undefined>(undefined);

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

  useEffect(() => {
    if (selectionRef.current === undefined) {
      selectionRef.current = selectedSpace?.link ?? null;
      return;
    }
    if (selectionRef.current === selectedSpace?.link) return;

    selectionRef.current = selectedSpace?.link ?? null;

    if (!selectedSpace?.link) {
      router.push('/spaces');
      return;
    }

    if (selectedSpace.link !== link) {
      router.push({ pathname: '/spaces/[link]', params: { link: selectedSpace.link } });
    }
  }, [link, router, selectedSpace?.link]);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<BuildingIcon size={24} />}
        iconClassName="bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
        title={space?.title || t('title')}
        description={t('description')}
        actions={
          <ButtonGroup>
            <IconButton
              icon={<RefreshIcon size={14} />}
              variant="ghost"
              onClick={loadSpace}
              responsive
            >
              {tSystem('refresh')}
            </IconButton>
            {space ? (
              <IconButton
                icon={<DeleteIcon size={14} />}
                variant="destructive"
                onClick={async () => {
                  if (removing) return;
                  setRemoving(true);
                  try {
                    await deleteSpace(space.id);
                    setSpace(null);
                    showSuccess(tSystem('deleted'));
                  } catch (err) {
                    const message = err instanceof Error ? err.message : tSystem('error');
                    showError(message);
                  } finally {
                    setRemoving(false);
                  }
                }}
                responsive
              >
                {tSystem('delete')}
              </IconButton>
            ) : null}
          </ButtonGroup>
        }
      />

      <Box>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            {tSystem('loading')}
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
