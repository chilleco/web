'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EntityManagement } from '@/shared/ui';
import { useToastActions } from '@/shared/hooks/useToast';
import { getCategories, deleteCategory } from '@/entities/category/api/categoryApi';
import type { Category } from '@/entities/category/model/category';
import { CategoryForm } from './CategoryForm';
import { CategoryTreeItem } from './CategoryTreeItem';

interface CategoryManagementProps {
  isCreateModalOpen?: boolean;
  onCreateModalChange?: (open: boolean) => void;
  triggerRefresh?: number; // Used to trigger refresh from parent
}

export function CategoryManagement({ 
  isCreateModalOpen = false, 
  onCreateModalChange,
  triggerRefresh 
}: CategoryManagementProps = {}) {
  const t = useTranslations('admin.categories');
  const { success, error: showError } = useToastActions();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Get all categories including nested structure for parent selector
      // Global error handler will automatically show toast notifications for any failures
      const data = await getCategories({ parent: 0, include_tree: true });
      setCategories(data);
    } catch (err) {
      // Global error handler already showed toast, just set local error state
      const errorMessage = err instanceof Error ? err.message : 'Failed to load categories';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Trigger refresh from parent
  useEffect(() => {
    if (triggerRefresh) {
      loadCategories();
    }
  }, [triggerRefresh, loadCategories]);

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(t('deleteConfirm', { title: category.title }))) {
      return;
    }

    try {
      // Global error handler will automatically show toast notifications for any failures
      await deleteCategory(category.id);
      await loadCategories(); // Refresh the list
      success(t('deleteSuccess', { title: category.title }));
    } catch (err) {
      // Global error handler already showed error toast
      const message = err instanceof Error ? err.message : 'Failed to delete category';
      showError(message);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
  };

  const handleFormSuccess = async () => {
    if (onCreateModalChange) onCreateModalChange(false);
    setEditingCategory(null);
    await loadCategories();
  };

  const handleFormCancel = () => {
    if (onCreateModalChange) onCreateModalChange(false);
    setEditingCategory(null);
  };

  return (
    <EntityManagement
      loading={loading}
      error={error}
      isEmpty={categories.length === 0}
      loadingLabel={t('loading')}
      emptyLabel={t('noCategories')}
      renderList={() => (
        <div>
          {categories.map((category, index) => (
            <CategoryTreeItem
              key={category.id}
              category={category}
              level={0}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              allCategories={categories}
              isFirst={index === 0}
            />
          ))}
        </div>
      )}
      createModal={
        onCreateModalChange ? (
          <Dialog open={isCreateModalOpen} onOpenChange={onCreateModalChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('createTitle')}</DialogTitle>
              </DialogHeader>
              <CategoryForm
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
                allCategories={categories}
              />
            </DialogContent>
          </Dialog>
        ) : undefined
      }
      editModal={
        editingCategory ? (
          <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('editTitle', { title: editingCategory.title })}</DialogTitle>
              </DialogHeader>
              <CategoryForm
                category={editingCategory}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
                allCategories={categories}
              />
            </DialogContent>
          </Dialog>
        ) : undefined
      }
    />
  );
}
