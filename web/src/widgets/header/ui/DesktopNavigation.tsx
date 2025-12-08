'use client';

import { IconButton } from '@/shared/ui/icon-button';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { CategoriesHoverPopup } from '@/widgets/category';
import { useNavigationItems } from '../model/navigationItems';

export default function DesktopNavigation() {
    const locale = useLocale();
    const router = useRouter();
    const navigationItems = useNavigationItems();
    type RouteHref = Parameters<typeof router.push>[0];

    const handleNavigate = (path: RouteHref) => {
        router.push(path);
    };

    return (
        <nav className="flex items-center space-x-1">
            {navigationItems.map((item) => {
                const Icon = item.icon;
                const button = (
                    <IconButton
                        key={item.key}
                        variant="ghost"
                        size="sm"
                        icon={<Icon size={16} />}
                        onClick={() => handleNavigate(item.path)}
                        responsive
                        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        {item.label}
                    </IconButton>
                );

                if (item.withCategoriesPopup) {
                    return (
                        <CategoriesHoverPopup key={item.key} locale={locale}>
                            {button}
                        </CategoriesHoverPopup>
                    );
                }

                return button;
            })}
        </nav>
    );
}
