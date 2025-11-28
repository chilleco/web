import { api } from '@/shared/services/api/client';
import { Product, ProductSaveRequest, ProductsGetRequest, ProductsGetResponse } from '../model/product';

interface ProductSaveResponse {
  id: number;
  new: boolean;
  product: Product;
}

function normalizeProduct(product: Product): Product {
  return {
    images: [],
    ...product,
    images: product.images || []
  };
}

function normalizeProductsResponse(response: ProductsGetResponse): ProductsGetResponse {
  return {
    ...response,
    products: response.products.map(normalizeProduct)
  };
}

export async function getProducts(params: ProductsGetRequest = {}): Promise<ProductsGetResponse> {
  const response = await api.post<ProductsGetResponse>('/products/get/', params);
  return normalizeProductsResponse(response);
}

export async function getProduct(id: number): Promise<Product> {
  const response = await getProducts({ id, limit: 1 });

  if (!response.products || response.products.length === 0) {
    throw new Error('Product not found');
  }

  return response.products[0];
}

function mapProductToApi(payload: ProductSaveRequest) {
  return {
    id: payload.id,
    title: payload.title,
    description: payload.description,
    images: payload.images ?? [],
    price: payload.price,
    original_price: payload.originalPrice,
    currency: payload.currency,
    rating: payload.rating,
    rating_count: payload.ratingCount,
    category: payload.category,
    in_stock: payload.inStock,
    is_new: payload.isNew,
    is_featured: payload.isFeatured,
    status: payload.status,
  };
}

export async function saveProduct(payload: ProductSaveRequest): Promise<ProductSaveResponse> {
  const response = await api.post<ProductSaveResponse>('/products/save/', mapProductToApi(payload));
  return {
    ...response,
    product: normalizeProduct(response.product),
  };
}

export async function deleteProduct(id: number): Promise<void> {
  await api.post('/products/rm/', { id });
}
