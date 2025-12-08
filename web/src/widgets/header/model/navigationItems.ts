'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { type ComponentType } from 'react';
import { CatalogIcon, HubIcon, PostsIcon, SpaceIcon } from '@/shared/ui/icons';

type NavigationPath = '/posts' | '/catalog' | '/space' | '/hub';
export type NavigationItemKey = 'posts' | 'catalog' | 'space' | 'hub';

type NavigationItemConfig = {
    key: NavigationItemKey;
    icon: ComponentType<{ size?: number }>;
    path: NavigationPath;
    withCategoriesPopup?: boolean;
};

const navigationConfig = [
    {
        key: 'posts',
        icon: PostsIcon,
        path: '/posts',
        withCategoriesPopup: true,
    },
    {
        key: 'catalog',
        icon: CatalogIcon,
        path: '/catalog',
    },
    {
        key: 'space',
        icon: SpaceIcon,
        path: '/space',
    },
    {
        key: 'hub',
        icon: HubIcon,
        path: '/hub',
    },
] as const satisfies ReadonlyArray<NavigationItemConfig>;

export type NavigationItem = NavigationItemConfig & { label: string };

export const useNavigationItems = () => {
    const t = useTranslations('navigation');

    return useMemo(
        () =>
            navigationConfig.map<NavigationItem>((item) => ({
                ...item,
                label: t(item.key),
            })),
        [t]
    );
};
