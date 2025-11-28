import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/shared/ui/page-header';
import { Box } from '@/shared/ui/box';
import { UserIcon } from '@/shared/ui/icons';

interface ProfilePageProps {
    params: Promise<{
        locale: string;
    }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
    await params; // locale is inferred by routing
    const tSystem = await getTranslations('system');
    const tProfile = await getTranslations('profile');

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <PageHeader
                    icon={<UserIcon size={24} />}
                    iconClassName="bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                    title={tSystem('profile')}
                    description={tProfile('description')}
                />
                <Box className="mt-6">
                    <p className="text-muted-foreground">
                        {tProfile('comingSoon')}
                    </p>
                </Box>
            </div>
        </div>
    );
}
