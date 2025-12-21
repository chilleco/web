import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SocialPage } from '@/widgets/social';

export async function generateMetadata(): Promise<Metadata> {
    const tNavigation = await getTranslations('navigation');
    const tSocial = await getTranslations('social');

    return {
        title: tNavigation('frens'),
        description: tSocial('description'),
    };
}

export default function SocialRoutePage() {
    return <SocialPage />;
}
