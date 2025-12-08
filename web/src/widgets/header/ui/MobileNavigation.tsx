'use client';

import { Button } from '@/shared/ui/button';
import { MenuIcon, CloseIcon } from '@/shared/ui/icons';
import { useTranslations } from 'next-intl';

interface MobileNavigationProps {
    isOpen: boolean;
    onToggle: () => void;
}

export default function MobileNavigation({ isOpen, onToggle }: MobileNavigationProps) {
    const t = useTranslations('system');
    const menuLabel = isOpen ? `${t('close')} ${t('menu')}` : t('menu');

    return (
        <Button variant="ghost" size="sm" onClick={onToggle} className="cursor-pointer">
            {isOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
            <span className="sr-only">{menuLabel}</span>
        </Button>
    );
}
