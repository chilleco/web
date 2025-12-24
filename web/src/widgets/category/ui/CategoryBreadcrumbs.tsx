'use client';

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import type { Category } from '@/entities/category';
import { buildBreadcrumbs, generateBreadcrumbStructuredData } from '@/entities/category';

interface CategoryBreadcrumbsProps {
  category?: Category | null;
  className?: string;
}

export function CategoryBreadcrumbs({ category, className = '' }: CategoryBreadcrumbsProps) {
  const t = useTranslations('navigation');
  const resolveBreadcrumbHref = (url: string) => {
    if (url === '/posts') {
      return '/posts' as const;
    }
    const slug = url.replace(/^\/posts\//, '');
    return {
      pathname: '/posts/[categoryUrl]',
      params: { categoryUrl: slug },
    } as const;
  };

  const breadcrumbs = buildBreadcrumbs(category || null, t('posts'));
  const structuredData = generateBreadcrumbStructuredData(breadcrumbs);

  return (
    <>
      <nav 
        role="navigation"
        aria-label="breadcrumb"
        itemScope
        itemType="http://schema.org/BreadcrumbList"
        className={`flex items-center space-x-2 text-sm text-muted-foreground ${className}`}
      >
        {breadcrumbs.map((breadcrumb, index) => (
          <div 
            key={breadcrumb.id}
            itemProp="itemListElement"
            itemScope
            itemType="http://schema.org/ListItem"
            className="flex items-center"
          >
            <meta content={breadcrumb.position.toString()} itemProp="position" />
            
            {index === breadcrumbs.length - 1 ? (
              // Current page - render as heading
              <h1 
                itemProp="name"
                itemID={breadcrumb.url}
                itemScope
                itemType="http://schema.org/Thing"
                className="font-semibold text-foreground text-2xl"
              >
                {breadcrumb.title}
              </h1>
            ) : (
              // Link to parent pages
              <>
                <Link
                  href={resolveBreadcrumbHref(breadcrumb.url)}
                  title={breadcrumb.title}
                  itemID={breadcrumb.url}
                  itemScope
                  itemType="http://schema.org/Thing"
                  className="hover:text-foreground underline decoration-dotted transition-colors"
                >
                  <span itemProp="name">{breadcrumb.title}</span>
                </Link>
                <span className="mx-2 text-muted-foreground/50">/</span>
              </>
            )}
          </div>
        ))}
      </nav>
      
      {/* Structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
    </>
  );
}
