'use client';

import { ReactNode } from 'react';
import { Alert, AlertDescription } from './alert';
import { Box } from './box';

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
