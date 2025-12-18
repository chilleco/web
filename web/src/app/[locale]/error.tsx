'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/shared/ui/page-header';
import { Box } from '@/shared/ui/box';
import { IconButton } from '@/shared/ui/icon-button';
import { useToastActions } from '@/shared/hooks/useToast';
import { AlertIcon, RefreshIcon, HomeIcon } from '@/shared/ui/icons';

export default function LocaleError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const tSystem = useTranslations('system');
  const { error: showError } = useToastActions();
  const router = useRouter();
  const hasShownToastRef = useRef(false);

  useEffect(() => {
    console.error(error);
    if (!hasShownToastRef.current) {
      showError(tSystem('server_error'));
      hasShownToastRef.current = true;
    }
  }, [error, showError, tSystem]);

  const isInternalServerRenderError =
    error.message?.toLowerCase().includes('server components render') ?? false;
  const digestMessage = error.digest ? tSystem('error_code', { code: error.digest }) : null;

  const handleRefresh = () => {
    reset();
    router.refresh();
  };

  const handleHome = () => {
    reset();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-6">
        <PageHeader
          icon={<AlertIcon size={24} />}
          iconClassName="bg-[var(--bg-red)] text-[var(--font-red)]"
          title={tSystem('server_error')}
          description={tSystem('server_error_description')}
          actions={
            <div className="flex items-center gap-2">
              <IconButton
                icon={<RefreshIcon size={16} />}
                responsive
                onClick={handleRefresh}
                className="cursor-pointer"
              >
                {tSystem('refresh')}
              </IconButton>
              <IconButton
                icon={<HomeIcon size={16} />}
                variant="outline"
                responsive
                onClick={handleHome}
                className="cursor-pointer"
              >
                {tSystem('main')}
              </IconButton>
            </div>
          }
        />
      </div>

      <div className="container mx-auto px-4 pb-10">
        <Box className="space-y-3">
          <div className="flex items-center gap-3 rounded-[0.75rem] bg-[var(--bg-red)] px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[0.75rem] bg-[var(--bg-red)] text-[var(--font-red)]">
              <AlertIcon size={18} />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">{tSystem('server_error')}</p>
              <p className="text-sm text-muted-foreground">{tSystem('server_error_description')}</p>
              {!isInternalServerRenderError && error.message && (
                <p className="text-xs text-muted-foreground break-words">{error.message}</p>
              )}
              {digestMessage && (isInternalServerRenderError || !error.message) && (
                <p className="text-xs text-muted-foreground break-words">{digestMessage}</p>
              )}
            </div>
          </div>
        </Box>
      </div>
    </div>
  );
}
