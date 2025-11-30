import { cache } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
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
import { PageHeader } from '@/shared/ui/page-header';
import { BreadcrumbDescription } from '@/shared/ui/breadcrumb-description';
import { ThreeColumnLayout } from '@/widgets/three-column-layout';
import { Box } from '@/shared/ui/box';
import { SidebarCard } from '@/shared/ui/sidebar-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { ButtonGroup } from '@/shared/ui/button-group';
import { IconButton } from '@/shared/ui/icon-button';
import { formatDate, formatDateTime } from '@/shared/lib/date';
import {
  PostsIcon,
  CalendarIcon,
  EyeIcon,
  MessageIcon,
  UserIcon,
  TagIcon,
  EditIcon,
  HideIcon,
  DeleteIcon,
  ClockIcon,
  RefreshIcon
} from '@/shared/ui/icons';

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

function calculateReadingTime(content: string): number {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
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
  const tNavigation = await getTranslations('navigation');

  const category = await getCategoryByUrlCached(categoryUrl, locale);
  if (category) {
    return buildCategoryMetadata(category, locale, tNavigation('posts'));
  }

  const postId = extractPostIdFromSlug(categoryUrl);
  if (!postId) {
    return {
      title: 'Post Not Found'
    };
  }

  try {
    const post = await getPostCached(postId);
    return buildPostMetadata(post, locale);
  } catch (error) {
    console.error('Failed to build post metadata', error);
    return {
      title: 'Post Not Found'
    };
  }
}

export default async function CategoryOrPostPage({ params }: CategoryPageProps) {
  const { locale, categoryUrl } = await params;
  const [tNavigation, tPosts, tSystem] = await Promise.all([
    getTranslations('navigation'),
    getTranslations('posts'),
    getTranslations('system')
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

  const post = await getPostCached(postId).catch((error) => {
    console.error('Failed to load post', error);
    return null;
  });

  if (!post) {
    notFound();
  }

  const relatedPosts = await loadRelatedPosts(post, locale);
  const breadcrumbs = buildPostBreadcrumbs(post, tNavigation('posts'));
  const summary = post.description || stripHtml(post.data).slice(0, 160);
  const readTimeMinutes = calculateReadingTime(post.data);
  const readTimeText = tPosts('detail.readTime', { minutes: readTimeMinutes });
  const formattedViews = new Intl.NumberFormat(locale).format(post.views ?? 0);
  const commentsCount = new Intl.NumberFormat(locale).format(post.comments?.length ?? 0);
  const createdAt = post.created ?? Math.floor(Date.now() / 1000);
  const updatedAt = post.updated ?? createdAt;
  const publishedAt = formatDateTime(createdAt);
  const updatedAtFormatted = formatDateTime(updatedAt);
  const showUpdated = updatedAt !== createdAt;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-6">
        <PageHeader
          icon={<PostsIcon size={24} />}
          iconClassName="bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          title={post.title}
          description={<BreadcrumbDescription breadcrumbs={breadcrumbs} />}
          actions={
            <ButtonGroup>
              <IconButton
                icon={<EditIcon size={16} />}
                variant="info"
                responsive
                aria-label={tSystem('edit')}
                title={tSystem('edit')}
                type="button"
              >
                {tSystem('edit')}
              </IconButton>
              <IconButton
                icon={<HideIcon size={16} />}
                variant="warning"
                responsive
                aria-label={tPosts('detail.actions.hide')}
                title={tPosts('detail.actions.hide')}
                type="button"
              >
                {tPosts('detail.actions.hide')}
              </IconButton>
              <IconButton
                icon={<DeleteIcon size={16} />}
                variant="destructive"
                responsive
                aria-label={tSystem('delete')}
                title={tSystem('delete')}
                type="button"
              >
                {tSystem('delete')}
              </IconButton>
            </ButtonGroup>
          }
        />
      </div>
      <ThreeColumnLayout
        className="pb-10"
        rightSidebar={
          <>
            <SidebarCard
              title={tPosts('detail.meta')}
              icon={
                <div className="flex h-10 w-10 items-center justify-center rounded-[0.75rem] bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                  <CalendarIcon size={20} />
                </div>
              }
              contentSpacing="sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-[0.75rem] bg-muted/60 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[0.75rem] bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                      <CalendarIcon size={16} />
                    </div>
                    <div className="text-sm text-muted-foreground">{tPosts('detail.publishedAt')}</div>
                  </div>
                  <div className="text-sm font-semibold text-foreground">{publishedAt}</div>
                </div>

                {showUpdated && (
                  <div className="flex items-center justify-between gap-3 rounded-[0.75rem] bg-muted/60 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[0.75rem] bg-slate-500/15 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300">
                        <RefreshIcon size={16} />
                      </div>
                      <div className="text-sm text-muted-foreground">{tPosts('detail.updatedAt')}</div>
                    </div>
                    <div className="text-sm font-semibold text-foreground">{updatedAtFormatted}</div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 rounded-[0.75rem] bg-muted/60 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[0.75rem] bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                      <EyeIcon size={16} />
                    </div>
                    <div className="text-sm text-muted-foreground">{tPosts('detail.views')}</div>
                  </div>
                  <div className="text-sm font-semibold text-foreground">{formattedViews}</div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-[0.75rem] bg-muted/60 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[0.75rem] bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
                      <ClockIcon size={16} />
                    </div>
                    <div className="text-sm text-muted-foreground">{readTimeText}</div>
                  </div>
                  <div className="text-sm font-semibold text-foreground">{readTimeText}</div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-[0.75rem] bg-muted/60 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[0.75rem] bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
                      <MessageIcon size={16} />
                    </div>
                    <div className="text-sm text-muted-foreground">{tPosts('comments')}</div>
                  </div>
                  <div className="text-sm font-semibold text-foreground">{commentsCount}</div>
                </div>

                {post.category_data && (
                  <Link
                    href={`/posts/${post.category_data.url}`}
                    className="flex items-center justify-between gap-3 rounded-[0.75rem] bg-muted/60 px-3 py-2 transition-all duration-300 ease-[cubic-bezier(0,0,0.5,1)] hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[0.75rem] bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                        <TagIcon size={16} />
                      </div>
                      <div className="text-sm text-muted-foreground">{tPosts('detail.category')}</div>
                    </div>
                    <div className="text-sm font-semibold text-foreground">{post.category_data.title}</div>
                  </Link>
                )}
              </div>
            </SidebarCard>

            <SidebarCard
              title={tPosts('detail.author')}
              icon={
                <div className="flex h-10 w-10 items-center justify-center rounded-[0.75rem] bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300">
                  <UserIcon size={20} />
                </div>
              }
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  {post.author?.image && (
                    <AvatarImage src={post.author.image} alt={post.author.name || post.author.login} />
                  )}
                  <AvatarFallback>
                    <UserIcon size={16} />
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="font-semibold leading-none">
                    {post.author?.name || post.author?.login || tSystem('guest')}
                  </div>
                  {post.author?.title && <div className="text-sm text-muted-foreground">{post.author.title}</div>}
                </div>
              </div>
            </SidebarCard>

            {relatedPosts.length > 0 && (
              <SidebarCard
                title={tPosts('detail.related')}
                icon={
                  <div className="flex h-10 w-10 items-center justify-center rounded-[0.75rem] bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                    <PostsIcon size={20} />
                  </div>
                }
                contentSpacing="sm"
              >
                <div className="space-y-3">
                  {relatedPosts.map((related) => (
                    <Link
                      key={related.id}
                      href={`/posts/${related.url}`}
                      className="flex gap-3 rounded-[0.75rem] bg-muted/60 p-3 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)] transition-all duration-300 ease-[cubic-bezier(0,0,0.5,1)] hover:scale-[1.01]"
                    >
                      {related.image && (
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[0.75rem]">
                          <Image
                            src={related.image}
                            alt={related.title}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                          {related.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(related.updated ?? related.created ?? createdAt)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </SidebarCard>
            )}
          </>
        }
      >
        <div className="space-y-6">
          <Box className="space-y-6">
            {post.image && (
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[1rem]">
                <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 70vw, 900px"
              />
            </div>
          )}

          {summary && (
            <p className="text-lg font-semibold leading-relaxed text-foreground">
              {summary}
            </p>
          )}

            <div className="space-y-4 text-base leading-relaxed text-foreground [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_img]:rounded-[1rem] [&_img]:shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)]">
              <div dangerouslySetInnerHTML={{ __html: post.data }} />
            </div>
          </Box>

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
        </div>
      </ThreeColumnLayout>
    </div>
  );
}
