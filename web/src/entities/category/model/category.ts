// Category entity types
export interface Category {
  id: number;
  url: string;
  title: string;
  description?: string;
  data?: string;
  image?: string;
  icon?: string; // FontAwesome icon key
  color?: string; // Hex color code
  locale?: string;
  created?: number;
  updated?: number;
  status?: number;
  parent?: number;
  user?: number;
  post_count?: number; // Number of posts in this category
  parents?: Array<{
    id: number;
    url: string;
    title: string;
  }>;
  categories?: Category[]; // Nested subcategories from backend
}

export interface CategoryTree extends Category {
  children?: CategoryTree[];
  depth?: number;
}

export interface CreateCategoryRequest {
  title: string;
  url?: string;
  description?: string;
  data?: string;
  image?: string;
  parent?: number;
  locale?: string;
  status?: number;
  icon?: string; // FontAwesome icon key
  color?: string; // Hex color code
}

export interface UpdateCategoryRequest {
  title?: string;
  url?: string;
  description?: string;
  data?: string;
  image?: string;
  parent?: number;
  locale?: string;
  status?: number;
  icon?: string; // FontAwesome icon key
  color?: string; // Hex color code
}

export interface GetCategoriesRequest {
  id?: number;        // Direct category id (API supports subtree fetch)
  url?: string;       // Fetch by url (API will resolve to id internally)
  locale?: string;
  parent?: number;    // Legacy parent filter - mapped to id for subtree requests
  status?: number;
  include_tree?: boolean; // Legacy flag - API always returns a tree
}

export interface CategoryWithSubcategories extends Category {
  subcategories?: Category[];
}
