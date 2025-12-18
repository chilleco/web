'use client';

import { useTranslations } from 'next-intl';
import { useToast } from '@/widgets/feedback-system';
import { Box } from '@/shared/ui/box';
import { IconButton } from '@/shared/ui/icon-button';
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon, LoadingIcon, MessageIcon } from '@/shared/ui/icons';

export function HubToastDemo() {
    const t = useTranslations('hub.toastDemo');
    const ts = useTranslations('system');
    const { toast, success, error, warning, info, loading } = useToast();

    return (
        <Box size="lg">
            <div className="space-y-4">
                <div className="space-y-1">
                    <h3 className="font-semibold">{t('title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('description')}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <IconButton
                        aria-label={t('actions.default')}
                        variant="outline"
                        responsive={true}
                        icon={<MessageIcon size={16} />}
                        onClick={() => toast(t('messages.default'))}
                    >
                        {t('actions.default')}
                    </IconButton>
                    <IconButton
                        aria-label={ts('success')}
                        variant="success"
                        responsive={true}
                        icon={<CheckIcon size={16} />}
                        onClick={() => success(t('messages.success'))}
                    >
                        {ts('success')}
                    </IconButton>
                    <IconButton
                        aria-label={ts('error')}
                        variant="destructive"
                        responsive={true}
                        icon={<CloseIcon size={16} />}
                        onClick={() => error(t('messages.error'))}
                    >
                        {ts('error')}
                    </IconButton>
                    <IconButton
                        aria-label={ts('warning')}
                        variant="warning"
                        responsive={true}
                        icon={<AlertIcon size={16} />}
                        onClick={() => warning(t('messages.warning'))}
                    >
                        {ts('warning')}
                    </IconButton>
                    <IconButton
                        aria-label={ts('info')}
                        variant="info"
                        responsive={true}
                        icon={<InfoIcon size={16} />}
                        onClick={() => info(t('messages.info'))}
                    >
                        {ts('info')}
                    </IconButton>
                    <IconButton
                        aria-label={ts('loading')}
                        variant="secondary"
                        responsive={true}
                        icon={<LoadingIcon size={16} />}
                        onClick={() => loading(t('messages.loading'))}
                    >
                        {ts('loading')}
                    </IconButton>
                </div>
            </div>
        </Box>
    );
}

