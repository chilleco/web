'use client';

import { useMemo, type ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import { CatalogIcon, PostsIcon, TasksIcon, UserGroupIcon } from '@/shared/ui/icons';

type NavigationItemKey = 'posts' | 'catalog' | 'tasks' | 'frens';
type NavigationPath = '/posts' | '/catalog' | '/tasks' | '/social';

type BottomNavigationItemConfig = {
    key: NavigationItemKey;
    icon: ComponentType<{ size?: number }>;
    path: NavigationPath;
};

const bottomNavigationConfig = [
    // {
    //     key: 'posts',
    //     icon: PostsIcon,
    //     path: '/posts',
    // },
    // {
    //     key: 'catalog',
    //     icon: CatalogIcon,
    //     path: '/catalog',
    // },
    {
        key: 'tasks',
        icon: TasksIcon,
        path: '/tasks',
    },
    {
        key: 'frens',
        icon: UserGroupIcon,
        path: '/social',
    },
] as const satisfies ReadonlyArray<BottomNavigationItemConfig>;

export type BottomNavigationItem = BottomNavigationItemConfig & { label: string };

export const useBottomNavigationItems = () => {
    const t = useTranslations('navigation');

    return useMemo(
        () =>
            bottomNavigationConfig.map<BottomNavigationItem>((item) => ({
                ...item,
                label: t(item.key),
            })),
        [t]
    );
};
