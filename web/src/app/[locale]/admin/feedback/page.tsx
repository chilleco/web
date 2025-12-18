'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/shared/ui/page-header';
import { IconButton } from '@/shared/ui/icon-button';
import { FeedbackIcon, RefreshIcon } from '@/shared/ui/icons';
import { FeedbackManagement } from '@/widgets/feedback-management';

export default function AdminFeedbackPage() {
  const t = useTranslations('admin.feedback');
  const tSystem = useTranslations('system');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FeedbackIcon size={24} />}
        iconClassName="bg-teal-500/15 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400"
        title={t('title')}
        description={t('description')}
        actions={
          <IconButton
            icon={<RefreshIcon size={16} />}
            variant="outline"
            responsive
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
          >
            {tSystem('refresh')}
          </IconButton>
        }
      />

      <FeedbackManagement triggerRefresh={refreshTrigger} />
    </div>
  );
}

