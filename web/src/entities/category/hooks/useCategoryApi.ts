'use client';

import { useMemo } from 'react';
import { useApiActions } from '@/shared/hooks/useApiWithToast';
import {
  getCategories,
  getCategoryTree,
  getCategory,
  getCategoryByUrl,
  getSubcategories,
  getCategoryWithSubcategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../api/categoryApi';
import type {
  CreateCategoryRequest,
  UpdateCategoryRequest,
  GetCategoriesRequest
} from '../model/category';

/**
 * Hook that provides category API functions with automatic toast notifications
 * This eliminates the need to manually handle errors and success messages in components
 */
export function useCategoryApi() {
  const apiActions = useApiActions();

  return useMemo(() => ({
    // Load functions (show error toasts only)
    loadCategories: (params?: GetCategoriesRequest) =>
      apiActions.wrap(getCategories, {
        errorMessage: 'Failed to load categories'
      })(params),

    loadCategoryTree: () =>
      apiActions.wrap(getCategoryTree, {
        errorMessage: 'Failed to load category tree'
      })(),

    loadCategory: (id: number) =>
      apiActions.wrap(getCategory, {
        errorMessage: 'Failed to load category'
      })(id),

    loadCategoryByUrl: (url: string, locale?: string) =>
      apiActions.wrap(getCategoryByUrl, {
        errorMessage: 'Failed to find category'
      })(url, locale),

    loadSubcategories: (parentId?: number, locale?: string) =>
      apiActions.wrap(getSubcategories, {
        errorMessage: 'Failed to load subcategories'
      })(parentId, locale),

    loadCategoryWithSubcategories: (id: number, locale?: string) =>
      apiActions.wrap(getCategoryWithSubcategories, {
        errorMessage: 'Failed to load category with subcategories'
      })(id, locale),

    // CRUD operations (show both success and error toasts)
    createCategory: (data: CreateCategoryRequest) =>
      apiActions.wrap(createCategory, {
        showSuccessToast: true,
        successMessage: 'Category created successfully!',
        errorMessage: 'Failed to create category'
      })(data),

    updateCategory: (id: number, data: UpdateCategoryRequest) =>
      apiActions.wrap(updateCategory, {
        showSuccessToast: true,
        successMessage: 'Category updated successfully!',
        errorMessage: 'Failed to update category'
      })(id, data),

    deleteCategory: (id: number) =>
      apiActions.wrap(deleteCategory, {
        showSuccessToast: true,
        successMessage: 'Category deleted successfully!',
        errorMessage: 'Failed to delete category'
      })(id),

    // Raw API access for custom handling
    ...apiActions
  }), [apiActions]);
}

/**
 * Simplified hook for common category operations
 * Pre-configured with sensible defaults for typical use cases
 */
export function useCategoryActions() {
  const categoryApi = useCategoryApi();

  return useMemo(() => ({
    // Most common operations with simplified interfaces
    load: categoryApi.loadCategories,
    create: categoryApi.createCategory,
    update: categoryApi.updateCategory,
    remove: categoryApi.deleteCategory,

    // Full API for advanced use cases
    api: categoryApi
  }), [categoryApi]);
}