'use client';

import { Link, type RouteHref } from '@/i18n/routing';
import { ReactNode } from 'react';
import { Alert, AlertDescription } from './alert';
import { Box } from './box';
import { cn } from '@/shared/lib/utils';

interface EntityManagementProps {
  loading: boolean;
  error?: string | null;
  isEmpty: boolean;
  loadingLabel: string;
  emptyLabel: string;
  renderList: () => ReactNode;
  createModal?: ReactNode;
  editModal?: ReactNode;
}

/**
 * Generic management shell for admin lists (categories, products, etc.)
 * Handles loading/error/empty states and renders supplied content + modals.
 */
export function EntityManagement({
  loading,
  error,
  isEmpty,
  loadingLabel,
  emptyLabel,
  renderList,
  createModal,
  editModal,
}: EntityManagementProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">{loadingLabel}</span>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        {createModal}
        {editModal}
      </>
    );
  }

  const content = isEmpty ? (
    <div className="text-center py-8 text-muted-foreground">
      <p>{emptyLabel}</p>
    </div>
  ) : (
    renderList()
  );

  return (
    <div className="space-y-6">
      <Box>{content}</Box>
      {createModal}
      {editModal}
    </div>
  );
}

interface EntityRowMetaItem {
  icon: ReactNode;
  keyLabel?: string;
  value: ReactNode;
}

interface EntityRowProps {
  id?: number | string;
  title: string;
  url?: string;
  urlHref?: RouteHref;
  badges?: ReactNode[];
  secondRowItems?: EntityRowMetaItem[];
  leftSlot?: ReactNode;
  rightActions?: ReactNode;
  className?: string;
}

/**
 * Common row layout used by admin lists: id + title + url + badges on first line,
 * dot-separated metadata on second line.
 */
export function EntityRow({
  id,
  title,
  url,
  urlHref,
  badges = [],
  secondRowItems = [],
  leftSlot,
  rightActions,
  className,
}: EntityRowProps) {
  const hasSecondRow = secondRowItems.length > 0;

  return (
    <div className={cn('flex items-center gap-4 w-full', className)}>
      {leftSlot}

      <div className={cn('flex-1 min-w-0 overflow-hidden', hasSecondRow ? '' : 'flex items-center')}>
        <div className="flex items-center gap-2 flex-wrap">
          {id !== undefined ? (
            <span className="font-bold text-muted-foreground hidden md:inline text-sm">#{id}</span>
          ) : null}
          <span className="font-medium truncate">{title}</span>
          {url ? (
            urlHref ? (
              <Link
                href={urlHref}
                className="text-xs text-muted-foreground hover:text-primary transition-colors underline decoration-dashed underline-offset-2"
              >
                /{url}
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">/{url}</span>
            )
          ) : null}
          {badges.length > 0 ? <div className="flex flex-wrap gap-2">{badges}</div> : null}
        </div>

        {hasSecondRow ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1 hidden md:flex">
            {secondRowItems.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-2 rounded-[0.75rem] bg-muted/60 px-2 py-1"
                title={item.keyLabel || undefined}
              >
                {item.icon}
                <span className="truncate">{item.value}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {rightActions ? <div className="flex-shrink-0 ml-auto">{rightActions}</div> : null}
    </div>
  );
}
