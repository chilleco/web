export interface Product {
  id: number;
  title: string;
  description?: string;
  images: string[];
  price: number;
  originalPrice?: number;
  currency?: string;
  rating?: number;
  ratingCount?: number;
  category?: string;
  inStock?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  discount?: number;
  created?: number;
  updated?: number;
  status?: number;
  url?: string;
}

export interface ProductsGetRequest {
  id?: number | number[];
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface ProductsGetResponse {
  products: Product[];
  count?: number;
}

export interface ProductSaveRequest {
  id?: number;
  title: string;
  description?: string;
  images?: string[];
  price: number;
  originalPrice?: number;
  currency?: string;
  rating?: number;
  ratingCount?: number;
  category?: string;
  inStock?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  discount?: number;
  status?: number;
}
