'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/shared/ui/page-header';
import { IconButton } from '@/shared/ui/icon-button';
import { PostsIcon, AddIcon } from '@/shared/ui/icons';
import { Link } from '@/i18n/routing';
import { PostManagement } from '@/widgets/post-management';

export default function AdminPostsPage() {
  const tAdmin = useTranslations('admin.posts');
  const tSystem = useTranslations('system');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<PostsIcon size={24} />}
        iconClassName="bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-400"
        title={tAdmin('title')}
        description={tAdmin('description')}
        actions={
          <IconButton
            asChild
            icon={<AddIcon size={16} />}
            variant="success"
            responsive
          >
            <Link href="/posts/create">
              {tSystem('add')}
            </Link>
          </IconButton>
        }
      />

      <PostManagement
        triggerRefresh={refreshTrigger}
      />
    </div>
  );
}
