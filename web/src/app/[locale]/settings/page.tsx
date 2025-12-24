import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SettingsPage } from '@/widgets/settings';

export async function generateMetadata(): Promise<Metadata> {
    const tSystem = await getTranslations('system');

    return {
        title: tSystem('settings'),
    };
}

export default function SettingsRoutePage() {
    console.log('!SETS0');
    return <SettingsPage />;
}

