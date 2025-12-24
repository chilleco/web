import { useCallback, useMemo } from 'react';
import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { getVkLaunchQuery } from '@/shared/lib/vk';

export type Locale = 'en' | 'ru' | 'zh' | 'es' | 'ar';

export const routing = defineRouting({
    // A list of all locales that are supported
    locales: ['en', 'ru', 'zh', 'es', 'ar'] as const,

    // Used when no locale matches
    defaultLocale: 'en',

    // The `pathnames` object maps the internal pathnames
    pathnames: {
        '/': '/',
        '/posts': '/posts',
        '/posts/[categoryUrl]': '/posts/[categoryUrl]',
        '/catalog/[id]': '/catalog/[id]',
        '/space': '/space',
        '/hub': '/hub',
        '/tasks': '/tasks',
        '/catalog': '/catalog',
        '/spaces': '/spaces',
        '/spaces/[link]': '/spaces/[link]',
        '/admin': '/admin',
        '/admin/categories': '/admin/categories',
        '/admin/posts': '/admin/posts',
        '/admin/products': '/admin/products',
        '/admin/feedback': '/admin/feedback',
        '/admin/spaces': '/admin/spaces',
        '/admin/users': '/admin/users',
        '/admin/tasks': '/admin/tasks',
        '/profile': '/profile',
        '/callback': '/callback',
        '/posts/create': '/posts/create',
        '/settings': '/settings',
        '/billing': '/billing',
        '/analytics': '/analytics',
        '/favorites': '/favorites',
        '/cart': '/cart',
        '/social': '/social'
        // You can add more custom pathnames here if needed
    },

    // Enable locale detection from various sources
    localeDetection: true
});

const navigation = createNavigation(routing);

export const { Link, redirect, usePathname } = navigation;

type AppRouterInstance = ReturnType<typeof navigation.useRouter>;
export type RouteHref = Parameters<AppRouterInstance['push']>[0];

const mergeVkQuery = (href: RouteHref, vkQuery: Record<string, string> | null): RouteHref => {
    if (!vkQuery || Object.keys(vkQuery).length === 0) {
        return href;
    }

    if (typeof href === 'string') {
        const url = new URL(href, 'http://localhost');
        const merged = new URLSearchParams(url.searchParams);
        Object.entries(vkQuery).forEach(([key, value]) => {
            if (!merged.has(key)) {
                merged.set(key, value);
            }
        });
        const search = merged.toString();
        const hash = url.hash || '';
        return `${url.pathname}${search ? `?${search}` : ''}${hash}` as RouteHref;
    }

    return {
        ...href,
        query: { ...vkQuery, ...(href.query ?? {}) },
    };
};

// VK Mini App navigation requires keeping launch params in the URL.
export const useRouter = () => {
    const router = navigation.useRouter();
    const vkQuery = useMemo(() => getVkLaunchQuery(), []);

    const push = useCallback<AppRouterInstance['push']>(
        (href, options) => router.push(mergeVkQuery(href, vkQuery), options),
        [router, vkQuery]
    );

    const replace = useCallback<AppRouterInstance['replace']>(
        (href, options) => router.replace(mergeVkQuery(href, vkQuery), options),
        [router, vkQuery]
    );

    return useMemo(
        () => ({
            ...router,
            push,
            replace,
        }),
        [push, replace, router]
    );
};
