'use client';

import { useEffect } from 'react';
import { usePathname } from '@/i18n/routing';
import { appendVkLaunchParamsToUrl, getVkLaunchQuery } from '@/shared/lib/vk';

export default function VkLaunchParamsSync() {
    const pathname = usePathname();

    useEffect(() => {
        const vkQuery = getVkLaunchQuery();
        if (!vkQuery) return;

        const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href]');
        anchors.forEach((anchor) => {
            const href = anchor.getAttribute('href');
            if (!href) return;

            const updated = appendVkLaunchParamsToUrl(href, vkQuery);
            if (updated !== href) {
                anchor.setAttribute('href', updated);
            }
        });
    }, [pathname]);

    return null;
}
