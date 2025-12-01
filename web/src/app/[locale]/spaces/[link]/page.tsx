import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SpacePageClient } from './SpacePageClient';

interface SpacePageProps {
  params: Promise<{
    link: string;
    locale: string;
  }>;
}

export async function generateMetadata({ params }: SpacePageProps): Promise<Metadata> {
  const { link } = await params;
  const t = await getTranslations('spaces.page');

  return {
    title: `${t('title')} | ${link}`,
    description: t('description')
  };
}

export default async function SpacePage({ params }: SpacePageProps) {
  const { link } = await params;

  return (
    <div className="px-4 lg:px-6 py-6 space-y-6">
      <SpacePageClient link={link} />
    </div>
  );
}
