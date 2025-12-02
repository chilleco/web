import { api } from '@/shared/services/api/client';
import { Product, ProductFeature, ProductOption, ProductSaveRequest, ProductsGetRequest, ProductsGetResponse } from '../model/product';

interface ProductSaveResponse {
  id: number;
  new: boolean;
  product: Product;
}

function calculateFinalPrice(price: number, discountType?: ProductOption['discountType'], discountValue?: number) {
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

type OptionStockLike = ProductOption & { inStock?: boolean | number };

function normalizeOption(option: ProductOption): ProductOption {
  const price = option.price || 0;
  const discountType = option.discountType;
  const discountValue = option.discountValue;
  const finalPrice = typeof option.finalPrice === 'number'
    ? option.finalPrice
    : calculateFinalPrice(price, discountType, discountValue);
  const rawStock = (option as OptionStockLike).stockCount ?? (option as OptionStockLike).inStock;
  let stockCount: number;
  if (typeof rawStock === 'number') {
    stockCount = rawStock;
  } else if (rawStock === false) {
    stockCount = 0;
  } else {
    stockCount = 1;
  }
  stockCount = Number.isFinite(stockCount) ? Math.max(0, Math.floor(stockCount)) : 0;

  return {
    ...option,
    price,
    finalPrice,
    discountType: discountType || undefined,
    discountValue: typeof discountValue === 'number' ? discountValue : undefined,
    images: option.images || [],
    attributes: normalizeFeatures(option.attributes),
    features: normalizeFeatures(option.features),
    stockCount,
  };
}

function normalizeProduct(product: Product): Product {
  const options = (product.options || []).map(normalizeOption);
  const fallbackPrice = Math.min(...options.map((option) => option.price || 0), product.price || 0, 0);
  const priceFrom = typeof product.priceFrom === 'number'
    ? product.priceFrom
    : fallbackPrice;
  const finalPriceFrom = typeof product.finalPriceFrom === 'number'
    ? product.finalPriceFrom
    : Math.min(...options.map((option) => option.finalPrice || option.price || 0), priceFrom);

  const normalizedOptions = options.length ? options : [{
    name: 'Default',
    price: priceFrom,
    finalPrice: finalPriceFrom,
    images: product.images || [],
    attributes: [],
    features: [],
    stockCount: 1,
  }];

  const inStock = typeof product.inStock === 'boolean'
    ? product.inStock
    : normalizedOptions.some((option) => (option.stockCount ?? 0) > 0);

  return {
    ...product,
    priceFrom,
    finalPriceFrom,
    images: product.images || [],
    features: normalizeFeatures(product.features),
    options: normalizedOptions,
    inStock,
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

  const options = (payload.options || []).map((option) => {
    const optionFeatures = (option.features || [])
      .filter((feature) => feature.key && feature.key.trim().length > 0)
      .map((feature) => ({
        key: feature.key.trim(),
        value: feature.value,
        value_type: feature.valueType || 'string',
      }));

    const attributes = (option.attributes || [])
      .filter((feature) => feature.key && feature.key.trim().length > 0)
      .map((feature) => ({
        key: feature.key.trim(),
        value: feature.value,
        value_type: feature.valueType || 'string',
      }));

    return {
      name: option.name,
      price: option.price,
      discount_type: option.discountType,
      discount_value: option.discountValue,
      images: option.images ?? [],
      rating: option.rating,
      rating_count: option.ratingCount,
      stock_count: Math.max(0, Math.floor(option.stockCount ?? 0)),
      attributes,
      features: optionFeatures,
    };
  });

  return {
    id: payload.id,
    title: payload.title,
    description: payload.description,
    images: payload.images ?? [],
    features,
    options,
    currency: payload.currency,
    category: payload.category,
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
