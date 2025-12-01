import { api } from '@/shared/services/api/client';
import { Product, ProductFeature, ProductSaveRequest, ProductsGetRequest, ProductsGetResponse } from '../model/product';

interface ProductSaveResponse {
  id: number;
  new: boolean;
  product: Product;
}

function calculateFinalPrice(price: number, discountType?: Product['discountType'], discountValue?: number) {
  const basePrice = price || 0;
  const value = discountValue || 0;

  if (!discountType || value <= 0) return basePrice;

  if (discountType === 'percent') {
    return Math.max(basePrice - (basePrice * value) / 100, 0);
  }

  return Math.max(basePrice - value, 0);
}

function normalizeFeatures(features?: ProductFeature[]): ProductFeature[] {
  if (!features || !Array.isArray(features)) return [];

  return features
    .filter((feature) => feature && typeof feature.key === 'string' && feature.key.trim().length > 0)
    .map((feature) => ({
      ...feature,
      key: feature.key.trim(),
      valueType: feature.valueType || 'string',
    }))
    .map((feature) => {
      if (feature.valueType === 'number') {
        return { ...feature, value: Number(feature.value) || 0 };
      }
      if (feature.valueType === 'boolean') {
        const normalized = String(feature.value).toLowerCase();
        return {
          ...feature,
          value: ['true', '1', 'yes', 'on'].includes(normalized),
        };
      }
      return { ...feature, value: String(feature.value ?? '') };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

function normalizeProduct(product: Product): Product {
  const basePrice = product.price || 0;
  const discountType = product.discountType;
  const discountValue = product.discountValue;
  const finalPrice = typeof product.finalPrice === 'number'
    ? product.finalPrice
    : calculateFinalPrice(basePrice, discountType, discountValue);

  return {
    images: [],
    ...product,
    price: basePrice,
    finalPrice,
    discountType: discountType || undefined,
    discountValue: typeof discountValue === 'number' ? discountValue : undefined,
    images: product.images || [],
    features: normalizeFeatures(product.features),
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
  const features = (payload.features || [])
    .filter((feature) => feature.key && feature.key.trim().length > 0)
    .map((feature) => ({
      key: feature.key.trim(),
      value: feature.value,
      value_type: feature.valueType || 'string',
    }));

  return {
    id: payload.id,
    title: payload.title,
    description: payload.description,
    images: payload.images ?? [],
    price: payload.price,
    discount_type: payload.discountType,
    discount_value: payload.discountValue,
    features,
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
