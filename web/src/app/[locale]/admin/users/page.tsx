'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/shared/ui/page-header';
import { IconButton } from '@/shared/ui/icon-button';
import { UsersIcon, RefreshIcon } from '@/shared/ui/icons';
import { UserManagement } from '@/widgets/user-management';

export default function AdminUsersPage() {
  const t = useTranslations('admin.users');
  const tSystem = useTranslations('system');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => setRefreshTrigger((prev) => prev + 1);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<UsersIcon size={24} />}
        iconClassName="bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
        title={t('title')}
        description={t('description')}
        actions={
          <IconButton
            icon={<RefreshIcon size={16} />}
            variant="outline"
            responsive
            onClick={handleRefresh}
          >
            {tSystem('refresh')}
          </IconButton>
        }
      />

      <UserManagement triggerRefresh={refreshTrigger} />
    </div>
  );
}
