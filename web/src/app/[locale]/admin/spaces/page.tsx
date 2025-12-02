'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/shared/ui/page-header';
import { IconButton } from '@/shared/ui/icon-button';
import { BuildingIcon, AddIcon } from '@/shared/ui/icons';
import { useRouter } from '@/i18n/routing';
import { useToastActions } from '@/shared/hooks/useToast';
import { saveSpace } from '@/entities/space';
import { SpaceManagement } from '@/widgets/space-management';

export default function AdminSpacesPage() {
  const t = useTranslations('admin.spaces');
  const tSystem = useTranslations('system');
  const router = useRouter();
  const { success, error: showError } = useToastActions();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const response = await saveSpace({ title: t('defaultTitle') });
      success(t('actions.createSuccess', { title: response.space.title }));
      setRefreshTrigger((prev) => prev + 1);
      router.push({
        pathname: '/spaces/[link]',
        params: { link: response.space.link },
        query: { edit: '1' }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : tSystem('error');
      showError(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BuildingIcon size={24} />}
        iconClassName="bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
        title={t('title')}
        description={t('description')}
        actions={
          <IconButton
            icon={<AddIcon size={16} />}
            variant="success"
            responsive
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? tSystem('loading') : tSystem('add')}
          </IconButton>
        }
      />

      <SpaceManagement triggerRefresh={refreshTrigger} />
    </div>
  );
}
