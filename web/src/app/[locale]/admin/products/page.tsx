'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/shared/ui/page-header';
import { IconButton } from '@/shared/ui/icon-button';
import { ShoppingIcon, AddIcon } from '@/shared/ui/icons';
import { ProductManagement } from '@/widgets/product-management';

export default function AdminProductsPage() {
  const t = useTranslations('admin.products');
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
        icon={<ShoppingIcon size={24} />}
        iconClassName="bg-[var(--bg-yellow)] text-[var(--font-yellow)]"
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

      <ProductManagement
        isCreateModalOpen={isCreateModalOpen}
        onCreateModalChange={handleModalChange}
        triggerRefresh={refreshTrigger}
      />
    </div>
  );
}
