'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { PageHeader } from '@/shared/ui/page-header';
import { Box } from '@/shared/ui/box';
import { IconButton } from '@/shared/ui/icon-button';
import { AddIcon, CoinsIcon, RefreshIcon, UserGroupIcon } from '@/shared/ui/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { cn } from '@/shared/lib/utils';
import { useToastActions } from '@/shared/hooks/useToast';
import { useApiErrorMessage } from '@/shared/hooks/useApiErrorMessage';
import { useShare } from '@/features/share';
import { getFrens } from '@/entities/user';
import type { FrenProfile } from '@/entities/user';

const REFERRAL_PERCENT = ''; // TODO: 5

const rankStyles: Record<number, string> = {
    1: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    2: 'bg-slate-400/15 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300',
    3: 'bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
};

const relationStyles: Record<string, string> = {
    referral: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    referrer: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    friend: 'bg-muted/70 text-muted-foreground',
};

const buildReferralUrl = (locale: string, referralKey: string) => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    const url = new URL(`/${locale}`, baseUrl);
    url.searchParams.set('utm', referralKey);
    return url.toString();
};

const getDisplayName = (fren: FrenProfile, fallback: string) => {
    const fullName = [fren.name, fren.surname].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;
    if (fren.title) return fren.title;
    if (fren.login) return fren.login;
    return fallback;
};

function RankBadge({ rank }: { rank: number }) {
    const style = rankStyles[rank] || 'bg-muted/70 text-muted-foreground';

    return (
        <div
            className={cn(
                'flex items-center justify-center w-9 h-9 rounded-[0.75rem] text-sm font-semibold',
                style
            )}
        >
            {rank}
        </div>
    );
}

function FrenRow({ fren, rank }: { fren: FrenProfile; rank: number }) {
    const tSocial = useTranslations('social');
    const displayName = getDisplayName(fren, tSocial('nameFallback', { id: fren.id }));
    const relationKey = fren.relation || 'friend';
    const relationLabels: Record<string, string> = {
        referral: tSocial('relation.referral'),
        referrer: tSocial('relation.referrer'),
        friend: tSocial('relation.friend'),
    };
    const relationLabel = relationLabels[relationKey] || relationLabels.friend;
    const relationStyle = relationStyles[relationKey] || relationStyles.friend;
    const balance = typeof fren.balance === 'number' ? fren.balance : 0;
    const loginLabel = fren.login ? `@${fren.login}` : null;

    return (
        <Box className="flex items-center gap-3" size="default">
            <RankBadge rank={rank} />

            <Avatar className="h-12 w-12 rounded-[0.75rem]">
                {fren.image ? <AvatarImage src={fren.image} alt={displayName} /> : null}
                <AvatarFallback />
            </Avatar>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold text-sm text-foreground truncate">{displayName}</div>
                    <span className={cn('text-xs px-2 py-1 rounded-[0.75rem]', relationStyle)}>
                        {relationLabel}
                    </span>
                </div>
                {loginLabel ? (
                    <div className="text-xs text-muted-foreground truncate">{loginLabel}</div>
                ) : null}
            </div>

            <div className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                <span>{balance}</span>
                <CoinsIcon size={14} />
            </div>
        </Box>
    );
}

function ReferralSummary({ count }: { count: number }) {
    const tSocial = useTranslations('social');

    return (
        <Box className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">{tSocial('countLabel')}</div>
            <div className="text-lg font-semibold text-foreground">{count}</div>
        </Box>
    );
}

function FriendsList({
    items,
    isLoading,
}: {
    items: FrenProfile[];
    isLoading: boolean;
}) {
    const tSystem = useTranslations('system');
    const tSocial = useTranslations('social');

    if (isLoading) {
        return (
            <Box className="py-10 text-center text-sm text-muted-foreground">
                {tSystem('loading')}
            </Box>
        );
    }

    if (items.length === 0) {
        return (
            <Box className="py-10 text-center text-sm text-muted-foreground">
                {tSocial('empty')}
            </Box>
        );
    }

    return (
        <div className="space-y-3">
            {items.map((fren, index) => (
                <FrenRow key={fren.id} fren={fren} rank={index + 1} />
            ))}
        </div>
    );
}

function AddFriendsBar({
    onAdd,
    disabled,
}: {
    onAdd: () => void;
    disabled: boolean;
}) {
    const tSocial = useTranslations('social');

    return (
        <div className="fixed inset-x-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] bottom-[calc(var(--mobile-bottom-bar-offset,0px))]">
            <div className="mx-auto max-w-3xl">
                <IconButton
                    icon={<AddIcon size={16} />}
                    className="w-full justify-center"
                    onClick={onAdd}
                    disabled={disabled}
                >
                    {tSocial('addFriends')}
                </IconButton>
            </div>
        </div>
    );
}

export default function SocialPage() {
    const locale = useLocale();
    const tNavigation = useTranslations('navigation');
    const tSocial = useTranslations('social');
    const tSystem = useTranslations('system');
    const { error: showError } = useToastActions();
    const formatApiErrorMessage = useApiErrorMessage();
    const { share, sharing } = useShare({
        shareMessage: tSystem('shareCopied'),
        unavailableMessage: tSystem('shareUnavailable'),
        errorMessage: tSystem('error'),
    });

    const [frens, setFrens] = useState<FrenProfile[]>([]);
    const [count, setCount] = useState(0);
    const [referralLink, setReferralLink] = useState<string | null>(null);
    const [referralCode, setReferralCode] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const fetchInFlightRef = useRef(false);

    const orderedFrens = useMemo(() => {
        return [...frens].sort((a, b) => {
            const balanceA = a.balance ?? 0;
            const balanceB = b.balance ?? 0;
            if (balanceA !== balanceB) return balanceB - balanceA;
            return (a.id ?? 0) - (b.id ?? 0);
        });
    }, [frens]);

    const loadFrens = useCallback(async (mode: 'initial' | 'refresh') => {
        if (fetchInFlightRef.current) return;
        fetchInFlightRef.current = true;

        if (mode === 'refresh') {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const response = await getFrens({ limit: 500 });
            setFrens(Array.isArray(response.frens) ? response.frens : []);
            setCount(typeof response.count === 'number' ? response.count : 0);
            setReferralLink(typeof response.referral_link === 'string' ? response.referral_link : null);
            setReferralCode(typeof response.referral_code === 'number' ? response.referral_code : null);
        } catch (err) {
            showError(formatApiErrorMessage(err, tSystem('server_error')));
        } finally {
            fetchInFlightRef.current = false;
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [formatApiErrorMessage, showError, tSystem]);

    useEffect(() => {
        loadFrens('initial');
    }, [loadFrens]);

    const handleAddFriends = useCallback(() => {
        const referralKey = referralLink ?? (referralCode !== null ? String(referralCode) : null);

        if (!referralKey) {
            showError(tSocial('referralMissing'));
            return;
        }

        const url = buildReferralUrl(locale, referralKey);
        share({ title: tSocial('shareTitle'), url });
    }, [locale, referralCode, referralLink, share, showError, tSocial]);

    return (
        <div
            className="min-h-screen bg-background"
            style={{ paddingBottom: 'calc(7rem + var(--mobile-bottom-bar-offset, 0px) + env(safe-area-inset-bottom))' }}
        >
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto space-y-6">
                    <PageHeader
                        icon={<UserGroupIcon size={24} />}
                        iconClassName="bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                        title={tNavigation('frens')}
                        description={tSocial('referralHint', { percent: REFERRAL_PERCENT })}
                        actions={
                            <IconButton
                                icon={<RefreshIcon size={16} />}
                                responsive
                                variant="outline"
                                onClick={() => loadFrens('refresh')}
                                disabled={isRefreshing || isLoading}
                            >
                                {tSystem('refresh')}
                            </IconButton>
                        }
                    />

                    <ReferralSummary count={count} />

                    <FriendsList items={orderedFrens} isLoading={isLoading} />
                </div>
            </div>

            <AddFriendsBar onAdd={handleAddFriends} disabled={sharing} />
        </div>
    );
}
