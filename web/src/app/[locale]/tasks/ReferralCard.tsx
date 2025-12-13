'use client';

import { useCallback } from 'react';
import { Box } from '@/shared/ui/box';
import { Button } from '@/shared/ui/button';
import { ButtonGroup } from '@/shared/ui/button-group';
import { useToast } from '@/widgets/feedback-system';
import { BullhornIcon, CheckCircleIcon, RocketIcon, ShareIcon } from '@/shared/ui/icons';

type ReferralStat = {
    label: string;
    value: string;
};

export type ReferralCardProps = {
    title: string;
    description: string;
    linkLabel: string;
    linkValue: string;
    copyLabel: string;
    copiedLabel: string;
    copyError: string;
    shareText: string;
    shareSuccess: string;
    statsTitle: string;
    stats: ReferralStat[];
    primaryCta: string;
    secondaryCta: string;
    anchorId?: string;
};

export default function ReferralCard({
    title,
    description,
    linkLabel,
    linkValue,
    copyLabel,
    copiedLabel,
    copyError,
    shareText,
    shareSuccess,
    statsTitle,
    stats,
    primaryCta,
    secondaryCta,
    anchorId,
}: ReferralCardProps) {
    const { success, error } = useToast();

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(linkValue);
            success(copiedLabel);
        } catch (err) {
            error(copyError);
        }
    }, [copiedLabel, copyError, error, linkValue, success]);

    const handleShare = useCallback(async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    text: shareText,
                    url: linkValue,
                });
                success(shareSuccess);
                return;
            }

            await handleCopy();
        } catch (err) {
            error(copyError);
        }
    }, [copyError, handleCopy, linkValue, shareSuccess, shareText, success, error]);

    return (
        <Box id={anchorId} size="lg" className="flex h-full flex-col gap-4">
            <div className="flex items-start gap-3">
                <div className="flex size-11 items-center justify-center rounded-[0.75rem] bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    <BullhornIcon size={18} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold leading-6">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-6">{description}</p>
                </div>
            </div>

            <div className="rounded-[1rem] bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">{linkLabel}</div>
                <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="break-all font-medium leading-6">{linkValue}</p>
                    <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="cursor-pointer">
                        <ShareIcon size={14} className="text-current" />
                        {copyLabel}
                    </Button>
                </div>
            </div>

            <ButtonGroup className="w-full">
                <Button type="button" className="flex-1 cursor-pointer" onClick={handleShare}>
                    <RocketIcon size={14} className="text-current" />
                    {primaryCta}
                </Button>
                <Button type="button" className="flex-1 cursor-pointer" variant="outline" onClick={handleCopy}>
                    <CheckCircleIcon size={14} className="text-current" />
                    {secondaryCta}
                </Button>
            </ButtonGroup>

            <div className="space-y-3">
                <div className="text-sm font-semibold leading-5 text-foreground">{statsTitle}</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {stats.map((stat) => (
                        <div key={stat.label} className="rounded-[0.75rem] bg-muted px-3 py-3">
                            <div className="text-xl font-semibold leading-7">{stat.value}</div>
                            <div className="text-xs text-muted-foreground leading-5">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </Box>
    );
}
