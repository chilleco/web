export interface Product {
  id: number;
  title: string;
  description?: string;
  images: string[];
  price: number;
  finalPrice?: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  features?: ProductFeature[];
  currency?: string;
  rating?: number;
  ratingCount?: number;
  category?: string;
  inStock?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
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

export type ProductFeatureValueType = 'string' | 'number' | 'boolean';

export interface ProductFeature {
  key: string;
  value: string | number | boolean;
  valueType: ProductFeatureValueType;
}

export interface ProductSaveRequest {
  id?: number;
  title: string;
  description?: string;
  images?: string[];
  price: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  features?: ProductFeature[];
  currency?: string;
  rating?: number;
  ratingCount?: number;
  category?: string;
  inStock?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  status?: number;
}
