'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntityManagement } from '@/shared/ui';
import { useToastActions } from '@/shared/hooks/useToast';
import { deleteSpace, getSpaces, type Space } from '@/entities/space';
import { SpaceListItem } from './SpaceListItem';

interface SpaceManagementProps {
  triggerRefresh?: number;
}

export function SpaceManagement({ triggerRefresh }: SpaceManagementProps = {}) {
  const t = useTranslations('admin.spaces');
  const { success, error: showError } = useToastActions();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchKeyRef = useRef<string | null>(null);

  const loadSpaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSpaces({ attached: false });
      setSpaces(response.spaces);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.load');
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    const fetchKey = 'admin-spaces';
    if (fetchKeyRef.current === fetchKey) return;
    fetchKeyRef.current = fetchKey;
    void loadSpaces();
  }, [loadSpaces]);

  useEffect(() => {
    if (triggerRefresh) {
      void loadSpaces();
    }
  }, [triggerRefresh, loadSpaces]);

  const handleDeleteSpace = async (space: Space) => {
    if (!confirm(t('actions.deleteConfirm', { title: space.title }))) {
      return;
    }

    try {
      await deleteSpace(space.id);
      success(t('actions.deleteSuccess', { title: space.title }));
      await loadSpaces();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.delete');
      showError(message);
    }
  };

  return (
    <EntityManagement
      loading={loading}
      error={error}
      isEmpty={spaces.length === 0}
      loadingLabel={t('loading')}
      emptyLabel={t('empty')}
      renderList={() => (
        <div className="divide-y divide-border/50 px-2">
          {spaces.map((space) => (
            <div key={space.id} className="py-3">
              <SpaceListItem space={space} onDelete={handleDeleteSpace} />
            </div>
          ))}
        </div>
      )}
    />
  );
}
