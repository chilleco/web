'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/shared/ui/page-header';
import { IconButton } from '@/shared/ui/icon-button';
import { CategoriesIcon, AddIcon } from '@/shared/ui/icons';
import { CategoryManagement } from '@/widgets/category-management';

export default function AdminCategoriesPage() {
  const t = useTranslations('admin.categories');
  const tSystem = useTranslations('system');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddClick = () => {
    setIsCreateModalOpen(true);
  };

  const handleModalChange = (open: boolean) => {
    setIsCreateModalOpen(open);
    if (!open) {
      // Trigger refresh when modal closes after successful creation
      setRefreshTrigger(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={<CategoriesIcon size={24} />}
        iconClassName="bg-[var(--bg-violet)] text-[var(--font-violet)]"
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

      {/* Categories Management */}
      <CategoryManagement 
        isCreateModalOpen={isCreateModalOpen}
        onCreateModalChange={handleModalChange}
        triggerRefresh={refreshTrigger}
      />
    </div>
  );
}
