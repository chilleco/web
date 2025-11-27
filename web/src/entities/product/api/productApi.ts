import { api } from '@/shared/services/api/client';
import { Product, ProductsGetRequest, ProductsGetResponse } from '../model/product';

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
