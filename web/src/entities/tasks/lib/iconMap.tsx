import { type ReactElement } from 'react';
import { BoxIcon, GiftIcon, LightningIcon, ShareIcon, SnowIcon, TrendUpIcon, UsersIcon } from '@/shared/ui/icons';

const ICON_MAP: Record<string, ReactElement> = {
    share: <ShareIcon size={18} />,
    gift: <GiftIcon size={18} />,
    merge: <TrendUpIcon size={18} />,
    friends: <UsersIcon size={18} />,
    box: <BoxIcon size={18} />,
    energy: <LightningIcon size={18} />,
    snow: <SnowIcon size={18} />,
    default: <LightningIcon size={18} />,
};

const ACCENT_MAP: Record<string, string> = {
    share: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    gift: 'bg-pink-500/15 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400',
    merge: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    friends: 'bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400',
    box: 'bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
    energy: 'bg-primary/15 text-primary dark:bg-primary/20',
    snow: 'bg-cyan-500/15 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400',
    default: 'bg-primary/15 text-primary dark:bg-primary/20',
};

export function resolveTaskIcon(icon?: string | null): ReactElement {
    if (!icon) {
        return ICON_MAP.default;
    }

    return ICON_MAP[icon] ?? ICON_MAP.default;
}

export function resolveTaskAccent(icon?: string | null): string {
    if (!icon) {
        return ACCENT_MAP.default;
    }

    return ACCENT_MAP[icon] ?? ACCENT_MAP.default;
}
