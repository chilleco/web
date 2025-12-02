import { cache } from 'react';
import { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { PostsGrid } from '@/widgets/posts-list';
import { SubcategoryNavigation } from '@/widgets/category';
import {
  getCategoryByUrl,
  getSubcategories,
  getCategoryTitle,
  getCategoryUrl,
  buildBreadcrumbs,
  generateCategoryImageStructuredData,
  generateBreadcrumbStructuredData
} from '@/entities/category';
import { getPosts, getPost, Post } from '@/entities/post';
import { ApiError } from '@/shared/services/api/client';
import { PostsIcon } from '@/shared/ui/icons';
import { BreadcrumbDescription } from '@/shared/ui/breadcrumb-description';
import { PostDetailClient } from './PostDetailClient';

const DEFAULT_SITE_NAME = process.env.NEXT_PUBLIC_NAME || 'web';
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_LOCALE;

const getCategoryByUrlCached = cache(async (categoryUrl: string, locale?: string) =>
  getCategoryByUrl(categoryUrl, locale)
);

const getPostCached = cache(async (postId: number) => getPost(postId));

interface CategoryPageProps {
  params: Promise<{
    locale: string;
    categoryUrl: string;
  }>;
  searchParams: Promise<{
    page?: string;
    edit?: string;
  }>;
}

function extractPostIdFromSlug(slug: string): number | null {
  const slugPart = (slug.split('/').pop() || slug).trim();
  const lastPart = slugPart.split('-').pop() || slugPart;

  if (/^\d+$/.test(lastPart)) {
    return Number.parseInt(lastPart, 10);
  }

  if (/^\d+$/.test(slugPart)) {
    return Number.parseInt(slugPart, 10);
  }

  return null;
}

function stripHtml(content: string): string {
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildPostBreadcrumbs(post: Post, rootTitle: string) {
  const breadcrumbs = buildBreadcrumbs(post.category_data || null, rootTitle);
  breadcrumbs.push({
    id: post.id,
    title: post.title,
    url: `/posts/${post.url}`,
    position: breadcrumbs.length
  });
  return breadcrumbs;
}

function buildPostCanonical(post: Post, locale?: string) {
  const base = process.env.NEXT_PUBLIC_WEB || '';
  const localePrefix = locale && locale !== DEFAULT_LOCALE ? `${locale}/` : '';
  return `${base}${localePrefix}posts/${post.url}`;
}

async function buildCategoryMetadata(
  category: Awaited<ReturnType<typeof getCategoryByUrl>>,
  locale: string,
  rootTitle: string
) {
  const title = getCategoryTitle(category, rootTitle);
  const canonical = getCategoryUrl(category, locale);

  return {
    title,
    description: category?.description || `Browse ${category?.title} posts and articles`,
    openGraph: {
      title,
      description: category?.description || `Browse ${category?.title} posts and articles`,
      url: canonical,
      type: 'website',
      ...(category?.image && {
        images: [
          {
            url: category.image,
            width: 1200,
            height: 630,
            alt: category.title
          }
        ]
      })
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: category?.description || `Browse ${category?.title} posts and articles`,
      ...(category?.image && { images: [category.image] })
    },
    alternates: {
      canonical
    }
  } satisfies Metadata;
}

async function buildPostMetadata(post: Post, locale: string) {
  const description = post.description || stripHtml(post.data).slice(0, 160);
  const canonical = buildPostCanonical(post, locale);
  const image = post.image;

  return {
    title: `${post.title} | ${DEFAULT_SITE_NAME}`,
    description,
    openGraph: {
      title: post.title,
      description,
      url: canonical,
      type: 'article',
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: post.title }] })
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      ...(image && { images: [image] })
    },
    alternates: {
      canonical
    }
  } satisfies Metadata;
}

async function loadRelatedPosts(post: Post, locale: string) {
  try {
    const { posts } = await getPosts({
      limit: 5,
      category: post.category,
      locale
    });

    return posts.filter((item) => item.id !== post.id).slice(0, 3);
  } catch (error) {
    console.error('Failed to load related posts', error);
    return [];
  }
}

function CategoryContent({
  category,
  subcategories,
  breadcrumbs,
  locale
}: {
  category: NonNullable<Awaited<ReturnType<typeof getCategoryByUrl>>>;
  subcategories: Awaited<ReturnType<typeof getSubcategories>>;
  breadcrumbs: ReturnType<typeof buildBreadcrumbs>;
  locale: string;
}) {
  const imageStructuredData = generateCategoryImageStructuredData(category);
  const breadcrumbStructuredData = generateBreadcrumbStructuredData(breadcrumbs);

  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const CategoryIcon = () => {
    if (category.icon && category.color) {
      return (
        <div
          className="w-12 h-12 flex items-center justify-center rounded-[0.75rem] mt-1"
          style={{
            backgroundColor: hexToRgba(category.color, 0.15),
            color: category.color
          }}
        >
          <i className={`fas fa-${category.icon}`} style={{ fontSize: '24px' }} />
        </div>
      );
    }
    if (category.icon) {
      return (
        <div className="w-12 h-12 flex items-center justify-center rounded-[0.75rem] mt-1 bg-muted text-muted-foreground">
          <i className={`fas fa-${category.icon}`} style={{ fontSize: '24px' }} />
        </div>
      );
    }
    if (category.color) {
      return (
        <div
          className="w-12 h-12 flex items-center justify-center rounded-[0.75rem] mt-1"
          style={{
            backgroundColor: hexToRgba(category.color, 0.15),
            color: category.color
          }}
        >
          <PostsIcon size={24} />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 flex items-center justify-center rounded-[0.75rem] mt-1 bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-400">
        <PostsIcon size={24} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <div className="w-full flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <CategoryIcon />
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-foreground mb-0.5 truncate">
                    {category.title}
                  </h1>
                  <div className="text-muted-foreground text-sm leading-relaxed">
                    <BreadcrumbDescription breadcrumbs={breadcrumbs} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {subcategories.length > 0 && (
            <SubcategoryNavigation subcategories={subcategories} className="mb-6" />
          )}

          {category.image && (
            <div className="relative w-full h-48 md:h-64 rounded-[1rem] overflow-hidden mb-8">
              <Image src={category.image} alt={category.title} fill className="object-cover" priority />
            </div>
          )}

          {category.description && (
            <div className="mb-8">
              <p className="text-lg text-muted-foreground leading-relaxed">{category.description}</p>
            </div>
          )}

          <PostsGrid categoryId={category.id} locale={locale} />

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(breadcrumbStructuredData)
            }}
          />

          {imageStructuredData && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(imageStructuredData)
              }}
            />
          )}

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'http://schema.org/',
                '@type': 'CollectionPage',
                name: category.title,
                description: category.description,
                url: getCategoryUrl(category, locale),
                ...(category.image && { image: category.image }),
                mainEntity: {
                  '@type': 'ItemList',
                  name: `${category.title} Posts`,
                  description: `Collection of posts in ${category.title} category`
                }
              })
            }}
          />
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { locale, categoryUrl } = await params;
  const [tNavigation, tSystem] = await Promise.all([
    getTranslations('navigation'),
    getTranslations('system')
  ]);

  const category = await getCategoryByUrlCached(categoryUrl, locale);
  if (category) {
    return buildCategoryMetadata(category, locale, tNavigation('posts'));
  }

  const postId = extractPostIdFromSlug(categoryUrl);
  if (!postId) {
    return {
      title: tSystem('server_error')
    };
  }

  try {
    const post = await getPostCached(postId);
    return buildPostMetadata(post, locale);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return {
        title: tSystem('server_error')
      };
    }
    throw error;
  }
}

export default async function CategoryOrPostPage({ params, searchParams }: CategoryPageProps) {
  const { locale, categoryUrl } = await params;
  const search = await searchParams;
  const [tNavigation, tPosts] = await Promise.all([
    getTranslations('navigation'),
    getTranslations('posts')
  ]);

  const category = await getCategoryByUrlCached(categoryUrl, locale);

  if (category) {
    const subcategories = await getSubcategories(category.id, locale);
    const breadcrumbs = buildBreadcrumbs(category, tNavigation('posts'));

    return (
      <CategoryContent
        category={category}
        subcategories={subcategories}
        breadcrumbs={breadcrumbs}
        locale={locale}
      />
    );
  }

  const postId = extractPostIdFromSlug(categoryUrl);
  if (!postId) {
    notFound();
  }

  let post: Post | null = null;

  try {
    post = await getPostCached(postId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const relatedPosts = await loadRelatedPosts(post, locale);
  const breadcrumbs = buildPostBreadcrumbs(post, tNavigation('posts'));
  const summary = post.description || stripHtml(post.data).slice(0, 160);
  const createdAt = post.created ?? Math.floor(Date.now() / 1000);
  const updatedAt = post.updated ?? createdAt;
  const startEditing = search?.edit === '1';

  return (
    <>
      <PostDetailClient
        post={post}
        relatedPosts={relatedPosts}
        breadcrumbs={breadcrumbs}
        locale={locale}
        summary={summary}
        createdAt={createdAt}
        updatedAt={updatedAt}
        startEditing={startEditing}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'http://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: summary,
            datePublished: new Date(createdAt * 1000).toISOString(),
            dateModified: new Date(updatedAt * 1000).toISOString(),
            ...(post.image ? { image: [post.image] } : {}),
            author: post.author?.name || post.author?.login,
            interactionStatistic: {
              '@type': 'InteractionCounter',
              interactionType: 'http://schema.org/ViewAction',
              userInteractionCount: post.views ?? 0
            },
            mainEntityOfPage: buildPostCanonical(post, locale)
          })
        }}
      />
    </>
  );
}
