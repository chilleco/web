import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getSubcategories, getCategoryTitle, getCategoryUrl, buildBreadcrumbs } from '@/entities/category';
import type { Post } from '@/entities/post';
import { PostDetailClient } from '../[categoryUrl]/PostDetailClient';

interface CreatePostPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({ params }: CreatePostPageProps): Promise<Metadata> {
  const { locale } = await params;
  const tNavigation = await getTranslations('navigation');

  const title = `${tNavigation('posts')} | Create`;
  const canonical = getCategoryUrl(null, locale);

  return {
    title,
    description: 'Create a new post',
    openGraph: {
      title,
      description: 'Create a new post',
      url: canonical,
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: 'Create a new post'
    },
    alternates: {
      canonical
    }
  };
}

export default async function CreatePostPage({ params }: CreatePostPageProps) {
  const { locale } = await params;
  const [tNavigation, tPosts] = await Promise.all([
    getTranslations('navigation'),
    getTranslations('posts')
  ]);

  const now = Math.floor(Date.now() / 1000);
  const emptyPost: Post = {
    id: 0,
    title: '',
    description: '',
    data: '',
    image: '',
    url: '',
    created: now,
    updated: now,
    status: 1,
    locale,
    category: undefined,
    comments: [],
    views: 0
  };

  const breadcrumbs = [
    ...buildBreadcrumbs(null, tNavigation('posts')),
    {
      id: -1,
      title: tPosts('add'),
      url: '/posts/create',
      position: 1
    }
  ];

  return (
    <PostDetailClient
      post={emptyPost}
      relatedPosts={[]}
      breadcrumbs={breadcrumbs}
      locale={locale}
      summary=""
      createdAt={now}
      updatedAt={now}
      isNew
    />
  );
}
