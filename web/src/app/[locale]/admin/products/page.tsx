'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/widgets/admin-layout';
import { PageHeader } from '@/shared/ui/page-header';
import { IconButton } from '@/shared/ui/icon-button';
import { ShoppingIcon, AddIcon } from '@/shared/ui/icons';
import { ProductManagement } from '@/widgets/product-management';

export default function AdminProductsPage() {
  const t = useTranslations('admin.products');
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
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          icon={<ShoppingIcon size={24} />}
          iconClassName="bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
          title={t('title')}
          description={t('description')}
          actions={
            <IconButton
              icon={<AddIcon size={16} />}
              variant="success"
              responsive
              onClick={handleAddClick}
            >
              {t('add')}
            </IconButton>
          }
        />

        <ProductManagement
          isCreateModalOpen={isCreateModalOpen}
          onCreateModalChange={handleModalChange}
          triggerRefresh={refreshTrigger}
        />
      </div>
    </AdminLayout>
  );
}
