'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/shared/ui/page-header';
import { IconButton } from '@/shared/ui/icon-button';
import { AddIcon, TasksIcon } from '@/shared/ui/icons';
import { TaskManagement } from '@/widgets/task-management';

export default function AdminTasksPage() {
  const t = useTranslations('admin.tasks');
  const tSystem = useTranslations('system');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddClick = () => setIsCreateModalOpen(true);
  const handleModalChange = (open: boolean) => {
    setIsCreateModalOpen(open);
    if (!open) {
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<TasksIcon size={24} />}
        iconClassName="bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
        title={t('title')}
        description={t('description')}
        actions={
          <IconButton
            icon={<AddIcon size={16} />}
            variant="success"
            responsive
            onClick={handleAddClick}
          >
            {tSystem('add')}
          </IconButton>
        }
      />

      <TaskManagement
        isCreateModalOpen={isCreateModalOpen}
        onCreateModalChange={handleModalChange}
        triggerRefresh={refreshTrigger}
      />
    </div>
  );
}

