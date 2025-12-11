'use client';

import { useTranslations } from 'next-intl';
import {
  AnalyticsFormulas,
  AnalyticsFunnel,
  AnalyticsRetention,
  AnalyticsStats,
  useAnalyticsStats,
} from '@/widgets/analytics-dashboard';
import { PageHeader } from '@/shared/ui/page-header';
import { IconButton } from '@/shared/ui/icon-button';
import { ChartIcon, RefreshIcon } from '@/shared/ui/icons';

export default function AnalyticsPage() {
  const tSystem = useTranslations('system');
  const tAdmin = useTranslations('admin.dashboard');
  const { stats, isLoading, fetchStats } = useAnalyticsStats();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <PageHeader
            icon={<ChartIcon size={24} />}
            iconClassName="bg-muted text-foreground"
            title={tSystem('analytics')}
            description={tAdmin('description')}
            actions={
              <IconButton
                icon={<RefreshIcon size={16} />}
                variant="outline"
                responsive
                onClick={fetchStats}
                disabled={isLoading}
              >
                {tSystem('refresh')}
              </IconButton>
            }
          />

          <AnalyticsStats stats={stats} isLoading={isLoading} />
          <AnalyticsFormulas />
          <AnalyticsFunnel />
          <AnalyticsRetention />
        </div>
      </div>
    </div>
  );
}
