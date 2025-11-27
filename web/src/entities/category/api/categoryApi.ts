import { api } from '@/shared/services/api/client';
import { shouldUseMockFallback, logApiWarning, addMockDelay } from '@/shared/config/api';
import type {
  Category,
  CategoryTree,
  CategoryWithSubcategories,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  GetCategoriesRequest
} from '../model/category';

// Mock categories for development/fallback
const mockCategories: Category[] = [
  {
    id: 1,
    url: 'technology',
    title: 'Technology',
    description: 'Latest tech news and trends',
    status: 1,
    locale: 'en'
  },
  {
    id: 2,
    url: 'business',
    title: 'Business',
    description: 'Business insights and analysis',
    status: 1,
    locale: 'en'
  },
  {
    id: 3,
    url: 'lifestyle',
    title: 'Lifestyle',
    description: 'Lifestyle and culture content',
    status: 1,
    locale: 'en'
  }
];

interface CategoriesResponse {
  categories?: Category | Category[];
}

function resolveCategoryId(params: GetCategoriesRequest): number | undefined {
  if (typeof params.id === 'number') {
    return params.id;
  }
  if (typeof params.parent === 'number' && params.parent > 0) {
    return params.parent;
  }
  return undefined;
}

function filterCategoriesByStatus(categories: Category[], status?: number): Category[] {
  if (status === undefined) return categories;

  return categories
    .filter(category => category.status === status)
    .map(category => ({
      ...category,
      categories: category.categories
        ? filterCategoriesByStatus(category.categories, status)
        : category.categories
    }));
}

function normalizeCategoriesResponse(
  response: CategoriesResponse,
  params: GetCategoriesRequest
): Category[] {
  const { categories } = response;
  if (!categories) return [];

  const statusFilter = params.status;

  if (Array.isArray(categories)) {
    return filterCategoriesByStatus(categories, statusFilter);
  }

  const requestedCategory = categories;

  // When requesting a parent category, return its direct children for compatibility
  if (params.parent !== undefined && params.parent > 0) {
    return filterCategoriesByStatus(requestedCategory.categories || [], statusFilter);
  }

  // For specific id/url requests, return the category itself (with nested tree)
  return filterCategoriesByStatus([requestedCategory], statusFilter);
}

function buildCategoriesRequest(params: GetCategoriesRequest) {
  const payload: Record<string, unknown> = {};

  const resolvedId = resolveCategoryId(params);
  if (resolvedId) {
    payload.id = resolvedId;
  }
  if (params.url) {
    payload.url = params.url;
  }
  if (params.locale) {
    payload.locale = params.locale;
  }

  return payload;
}

async function fetchCategories(params: GetCategoriesRequest): Promise<Category[]> {
  const response = await api.post<CategoriesResponse>('/categories/get/', buildCategoriesRequest(params));
  return normalizeCategoriesResponse(response, params);
}

function filterMockCategories(params: GetCategoriesRequest): Category[] {
  let filtered = [...mockCategories];

  if (params.locale) {
    filtered = filtered.filter(cat => cat.locale === params.locale);
  }

  if (params.parent !== undefined) {
    filtered = filtered.filter(cat => (cat.parent || 0) === params.parent);
  }

  if (params.status !== undefined) {
    filtered = filtered.filter(cat => cat.status === params.status);
  }

  return filtered;
}

export async function getCategories(params: GetCategoriesRequest = {}): Promise<Category[]> {
  if (shouldUseMockFallback()) {
    try {
      return await fetchCategories(params);
    } catch (error) {
      logApiWarning('Categories API not available, using mock data', error);
      await addMockDelay();
      return filterMockCategories(params);
    }
  }

  // Production mode - use the official API route
  return fetchCategories(params);
}

export async function getCategoryTree(): Promise<CategoryTree[]> {
  return getCategories() as Promise<CategoryTree[]>;
}

export async function getCategory(id: number, locale?: string): Promise<Category> {
  const categories = await getCategories({ id, locale });
  const category = categories[0];

  if (!category) {
    throw new Error('Category not found');
  }

  return category;
}

// Helper function to build the complete parent hierarchy for a category
function buildParentHierarchy(categories: Category[], targetCategory: Category): Array<{ id: number; url: string; title: string; }> {
  const parents: Array<{ id: number; url: string; title: string; }> = [];

  // Helper to find category by ID in nested structure
  const findCategoryById = (cats: Category[], id: number): Category | null => {
    for (const cat of cats) {
      if (cat.id === id) {
        return cat;
      }
      if (cat.categories && cat.categories.length > 0) {
        const found = findCategoryById(cat.categories, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Build the path by traversing up through parent IDs
  let currentParentId = targetCategory.parent;

  while (currentParentId && currentParentId !== 0) {
    const parent = findCategoryById(categories, currentParentId);
    if (parent) {
      // Add to the beginning of the array to maintain correct order (root -> leaf)
      parents.unshift({
        id: parent.id,
        url: parent.url || '',
        title: parent.title
      });
      currentParentId = parent.parent;
    } else {
      break;
    }
  }

  return parents;
}

// Helper function to recursively search through nested categories by URL
// Internal recursive function that preserves the original full categories array
function findCategoryRecursive(categories: Category[], fullCategories: Category[], url: string): Category | null {
  for (const category of categories) {
    if (category.url === url) {
      // Add parent hierarchy to the found category using the ORIGINAL full categories array
      const categoryWithParents = {
        ...category,
        parents: buildParentHierarchy(fullCategories, category)
      };
      return categoryWithParents;
    }
    if (category.categories && category.categories.length > 0) {
      const found = findCategoryRecursive(category.categories, fullCategories, url);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

// Public wrapper function
function findCategoryByUrlRecursive(categories: Category[], url: string): Category | null {
  return findCategoryRecursive(categories, categories, url);
}

// Helper function to recursively search through nested categories by ID
function findCategoryByIdRecursive(categories: Category[], id: number): Category | null {
  for (const category of categories) {
    if (category.id === id) {
      return category;
    }
    if (category.categories && category.categories.length > 0) {
      const found = findCategoryByIdRecursive(category.categories, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export async function getCategoryByUrl(url: string, locale?: string): Promise<Category | null> {
  try {
    // First try with the specified locale
    if (locale) {
      const categoriesWithLocale = await getCategories({ parent: 0, locale, status: 1, include_tree: true });
      const result = findCategoryByUrlRecursive(categoriesWithLocale, url);
      if (result) {
        return result;
      }
    }

    // Fallback: search without locale filter to find categories with different locales
    const allCategories = await getCategories({ parent: 0, status: 1, include_tree: true });
    return findCategoryByUrlRecursive(allCategories, url);
  } catch (error) {
    logApiWarning('Category lookup failed', error);
    return null;
  }
}

export async function getSubcategories(parentId?: number, locale?: string): Promise<Category[]> {
  if (parentId === undefined) {
    // Get top-level categories (parent: 0 in backend) with full tree structure
    // Try with locale first, then fallback to all categories
    if (locale) {
      const categoriesWithLocale = await getCategories({ parent: 0, locale, status: 1, include_tree: true });
      if (categoriesWithLocale.length > 0) {
        return categoriesWithLocale;
      }
    }
    // Fallback to all categories without locale filter
    return await getCategories({ parent: 0, status: 1, include_tree: true });
  } else {
    // Get direct subcategories using parent filter
    // Try with locale first, then fallback to all subcategories of this parent
    if (locale) {
      const subcategoriesWithLocale = await getCategories({ parent: parentId, locale, status: 1, include_tree: true });
      if (subcategoriesWithLocale.length > 0) {
        return subcategoriesWithLocale;
      }
    }
    // Fallback to all subcategories without locale filter
    return await getCategories({ parent: parentId, status: 1, include_tree: true });
  }
}

export async function getCategoryWithSubcategories(
  id: number,
  locale?: string
): Promise<CategoryWithSubcategories> {
  const category = await getCategory(id);
  const subcategories = await getSubcategories(id, locale);
  return { ...category, subcategories };
}

export async function createCategory(data: CreateCategoryRequest): Promise<Category> {
  if (shouldUseMockFallback()) {
    try {
      const response = await api.post<Category>('/categories/', data);
      return response;
    } catch (error) {
      logApiWarning('Create category API not available, using mock response', error);
      await addMockDelay();

      // Return mock created category
      const newCategory: Category = {
        id: Math.max(...mockCategories.map(c => c.id)) + 1,
        url: data.title?.toLowerCase().replace(/\s+/g, '-') || 'new-category',
        title: data.title || 'New Category',
        description: data.description,
        parent: data.parent || 0,
        status: 1,
        locale: 'en',
        created: Date.now(),
        updated: Date.now()
      };

      mockCategories.push(newCategory);
      return newCategory;
    }
  } else {
    // Production mode - global error handler will handle errors and show toast notifications
    return api.post<Category>('/categories/', data);
  }
}

export async function updateCategory(id: number, data: UpdateCategoryRequest): Promise<Category> {
  if (shouldUseMockFallback()) {
    try {
      const response = await api.put<Category>(`/categories/${id}/`, data);
      return response;
    } catch (error) {
      logApiWarning(`Update category ${id} API not available, using mock response`, error);
      await addMockDelay();

      // Find and update mock category
      const categoryIndex = mockCategories.findIndex(cat => cat.id === id);
      if (categoryIndex === -1) {
        throw new Error('Category not found');
      }

      const updatedCategory = {
        ...mockCategories[categoryIndex],
        ...data,
        updated: Date.now()
      };

      mockCategories[categoryIndex] = updatedCategory;
      return updatedCategory;
    }
  } else {
    // Production mode - global error handler will handle errors and show toast notifications
    return api.put<Category>(`/categories/${id}/`, data);
  }
}

export async function deleteCategory(id: number): Promise<void> {
  if (shouldUseMockFallback()) {
    try {
      await api.delete(`/categories/${id}/`);
    } catch (error) {
      logApiWarning(`Delete category ${id} API not available, using mock response`, error);
      await addMockDelay();

      // Remove from mock data
      const categoryIndex = mockCategories.findIndex(cat => cat.id === id);
      if (categoryIndex === -1) {
        throw new Error('Category not found');
      }

      mockCategories.splice(categoryIndex, 1);
    }
  } else {
    // Production mode - global error handler will handle errors and show toast notifications
    await api.delete(`/categories/${id}/`);
  }
}
