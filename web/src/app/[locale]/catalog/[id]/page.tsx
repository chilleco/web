'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { use } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/shared/ui/page-header';
import { Box } from '@/shared/ui/box';
import { ButtonGroup } from '@/shared/ui/button-group';
import { IconButton } from '@/shared/ui/icon-button';
import { Badge } from '@/shared/ui/badge';
import { Pricing } from '@/shared/ui/card';
import { useToastActions } from '@/shared/hooks/useToast';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { toggleCartItem, selectCartItemsAsSet } from '@/features/cart';
import { toggleFavorite, selectFavoriteItemsAsSet } from '@/features/favorites';
import { useShare } from '@/features/share';
import { getProduct, Product, ProductOption } from '@/entities/product';
import { selectSelectedSpace } from '@/features/spaces/stores/spaceSelectionSlice';
import { useRouter } from '@/i18n/routing';
import {
  HeartIcon,
  ShareIcon,
  ShoppingIcon,
  StarIcon,
  TagIcon,
  ImageIcon,
} from '@/shared/ui/icons';

interface ProductPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

function parseProductId(raw: string): number | null {
  const match = raw.match(/(\d+)/g);
  if (!match || match.length === 0) return Number.isNaN(Number(raw)) ? null : Number(raw);
  const idString = match[match.length - 1];
  const parsed = Number(idString);
  return Number.isNaN(parsed) ? null : parsed;
}

function calculateFinalPrice(option: ProductOption) {
  if (typeof option.finalPrice === 'number') {
    return option.finalPrice;
  }

  const basePrice = option.price || 0;
  const value = option.discountValue || 0;

  if (!option.discountType || value <= 0) return basePrice;
  if (option.discountType === 'percent') {
    return Math.max(basePrice - (basePrice * value) / 100, 0);
  }
  return Math.max(basePrice - value, 0);
}

function buildOptionLabel(option: ProductOption, currency: string | undefined) {
  const finalPrice = calculateFinalPrice(option);
  if (option.discountType && option.discountValue && finalPrice < option.price) {
    return `${option.name} — ${currency ?? ''}${finalPrice.toFixed(2)}`.trim();
  }
  return `${option.name} — ${currency ?? ''}${(option.price || 0).toFixed(2)}`.trim();
}

export default function ProductPage({ params }: ProductPageProps) {
  const t = useTranslations('catalog.product');
  const tSystem = useTranslations('system');
  const tCartPage = useTranslations('catalog.pages.cart');
  const { success, error, info } = useToastActions();
  const dispatch = useAppDispatch();
  const cart = useAppSelector(selectCartItemsAsSet);
  const favorites = useAppSelector(selectFavoriteItemsAsSet);
  const router = useRouter();
  const shareUrl = useMemo(() => (typeof window !== 'undefined' ? window.location.href : ''), []);
  const selectedSpace = useAppSelector(selectSelectedSpace);
  const { share, sharing, available: shareAvailable } = useShare({
    shareMessage: tSystem('shareCopied'),
    unavailableMessage: tSystem('shareUnavailable'),
    errorMessage: tSystem('error'),
  });

  const resolvedParams = use(params);
  const productId = useMemo(() => parseProductId(resolvedParams.id), [resolvedParams.id]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const marginFactor = useMemo(() => {
    const margin = selectedSpace?.margin ?? 0;
    return 1 + Math.max(0, margin) / 100;
  }, [selectedSpace?.margin]);
  const applyMargin = (value?: number | null) => (value ?? 0) * marginFactor;
  const getOptionFinalPrice = (option?: ProductOption | null) =>
    applyMargin(option ? calculateFinalPrice(option) : 0);
  const getOptionBasePrice = (option?: ProductOption | null) => applyMargin(option?.price);

  useEffect(() => {
    if (!productId) {
      setErrorMessage(tSystem('error'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    getProduct(productId)
      .then((fetched) => {
        setProduct(fetched);
        setSelectedOptionId(fetched.options?.[0]?.name || null);
        setSelectedImageIndex(0);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : tSystem('error');
        setErrorMessage(message);
        error(message);
      })
      .finally(() => setLoading(false));
  }, [error, productId, tSystem]);

  const selectedOption =
    product?.options?.find((option) => option.name === selectedOptionId) ||
    product?.options?.[0] ||
    null;

  const galleryImages =
    (selectedOption?.images?.length ? selectedOption.images : product?.images) || [];

  const productFeatures = useMemo(() => product?.features || [], [product]);
  const optionAttributes = useMemo(() => selectedOption?.attributes || [], [selectedOption]);
  const optionFeatures = useMemo(() => selectedOption?.features || [], [selectedOption]);
  const isFavorite = product ? favorites.has(product.id) : false;
  const inCart = product ? cart.has(product.id) : false;
  const favoritesCount = favorites.size;
  const cartCount = cart.size;

  const handleAddToCart = () => {
    if (!product) return;
    const willBeInCart = !inCart;
    dispatch(toggleCartItem(product.id));
    if (willBeInCart) {
      success(t('addedToCartToast', { title: product.title }));
    } else {
      info(t('removedFromCartToast', { title: product.title }));
    }
  };

  const handleToggleFavorite = () => {
    if (!product) return;
    const willBeFavorite = !isFavorite;
    dispatch(toggleFavorite(product.id));
    if (willBeFavorite) {
      success(t('favoriteAddedToast', { title: product.title }));
    } else {
      info(t('favoriteRemovedToast', { title: product.title }));
    }
  };

  const handleSelectImage = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleSelectOption = (optionName: string) => {
    setSelectedOptionId(optionName);
    setSelectedImageIndex(0);
  };

  const renderGallery = () => {
    const mainImage = galleryImages[selectedImageIndex] || galleryImages[0];

    return (
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-1 flex flex-col gap-2 overflow-y-auto max-h-[28rem] pr-1">
          {galleryImages.length === 0 ? (
            <div className="aspect-[3/4] rounded-[1rem] bg-muted flex items-center justify-center">
              <ImageIcon size={20} className="text-muted-foreground" />
            </div>
          ) : (
            galleryImages.map((thumb, index) => (
              <button
                key={thumb + index}
                type="button"
                className={`relative aspect-[3/4] rounded-[1rem] overflow-hidden border-2 cursor-pointer ${index === selectedImageIndex ? 'border-primary' : 'border-transparent'
                  }`}
                onClick={() => handleSelectImage(index)}
              >
                <Image
                  src={thumb}
                  alt={`${product?.title || 'product'}-${index}`}
                  fill
                  className="object-cover"
                  sizes="120px"
                />
              </button>
            ))
          )}
        </div>
        <div className="col-span-4 relative rounded-[1rem] overflow-hidden bg-muted min-h-[24rem]">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product?.title || 'product'}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 70vw"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImageIcon size={32} />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 space-y-6">
        <PageHeader
          icon={<ShoppingIcon size={24} />}
          title={t('loading')}
          description={t('loading')}
        />
        <Box>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded-[0.75rem] w-1/3" />
            <div className="h-64 bg-muted rounded-[1rem]" />
          </div>
        </Box>
      </div>
    );
  }

  if (!product || errorMessage) {
    return (
      <div className="container mx-auto px-4 py-10 space-y-6">
        <PageHeader
          icon={<ShoppingIcon size={24} />}
          title={tSystem('error')}
          description={errorMessage || t('loadError')}
        />
      </div>
    );
  }

  const productBasePriceFrom = applyMargin(product.priceFrom ?? product.price ?? 0);
  const productFinalPriceFrom = applyMargin(
    product.finalPriceFrom ?? product.priceFrom ?? product.price ?? 0,
  );
  const finalPrice = selectedOption ? getOptionFinalPrice(selectedOption) : productFinalPriceFrom;
  const basePrice = selectedOption ? getOptionBasePrice(selectedOption) : productBasePriceFrom;
  const pricePrefix = product.options?.length ? t('priceFrom') : undefined;

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <PageHeader
        icon={<ShoppingIcon size={24} />}
        title={product.title}
        description={product.category || ''}
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonGroup>
              <IconButton
                variant={isFavorite ? 'secondary' : 'outline'}
                icon={<HeartIcon size={14} />}
                onClick={handleToggleFavorite}
                responsive
                className="relative"
              >
                {isFavorite ? tSystem('remove') : tSystem('add')}
                {favoritesCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 min-w-[1rem] h-4 flex items-center justify-center p-0 text-[10px] text-white bg-red-500 border-red-500 pointer-events-none z-10"
                  >
                    {favoritesCount}
                  </Badge>
                )}
              </IconButton>
              <IconButton
                variant={inCart ? 'secondary' : 'default'}
                icon={<ShoppingIcon size={14} />}
                onClick={handleAddToCart}
                responsive
                className="relative"
              >
                {inCart ? tSystem('remove') : tSystem('add')}
                {cartCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 min-w-[1rem] h-4 flex items-center justify-center p-0 text-[10px] text-white bg-red-500 border-red-500 pointer-events-none z-10"
                  >
                    {cartCount}
                  </Badge>
                )}
              </IconButton>
            </ButtonGroup>
            <ButtonGroup>
              <IconButton
                variant="outline"
                icon={<ShareIcon size={14} />}
                onClick={() => product && share({ title: product.title, url: shareUrl })}
                responsive
                disabled={sharing || !shareAvailable}
              >
                {tSystem('share')}
              </IconButton>
              <IconButton
                variant="outline"
                icon={<ShoppingIcon size={14} />}
                onClick={() => router.push({ pathname: '/cart' })}
                responsive
                className="relative"
              >
                {tCartPage('openButton')}
                {cartCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 min-w-[1rem] h-4 flex items-center justify-center p-0 text-[10px] text-white bg-red-500 border-red-500 pointer-events-none z-10"
                  >
                    {cartCount}
                  </Badge>
                )}
              </IconButton>
            </ButtonGroup>
          </div>
        }
      />

      <Box className="space-y-6">
        {renderGallery()}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Pricing price={finalPrice} basePrice={basePrice} currency={product.currency} pricePrefix={pricePrefix} />
              {product.rating ? (
                <Badge variant="outline" className="inline-flex items-center gap-1">
                  <StarIcon size={14} className="text-amber-500" /> {product.rating.toFixed(1)}
                </Badge>
              ) : null}
              {product.ratingCount ? (
                <Badge variant="secondary" className="inline-flex items-center gap-1">
                  <TagIcon size={12} /> {product.ratingCount}
                </Badge>
              ) : null}
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t('optionsTitle')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(product.options || []).map((option) => {
                  const optionFinal = getOptionFinalPrice(option);
                  const optionBasePrice = getOptionBasePrice(option);
                  const isSelected = selectedOptionId === option.name;
                  return (
                    <button
                      key={option.name}
                      type="button"
                      onClick={() => handleSelectOption(option.name)}
                      className={`w-full text-left p-4 rounded-[1rem] bg-muted transition-all cursor-pointer ${isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{option.name}</span>
                        <Pricing
                          price={optionFinal}
                          basePrice={optionBasePrice}
                          currency={product.currency}
                        />
                      </div>
                      {(option.attributes && option.attributes.length > 0) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {option.attributes.map((attr) => (
                            <Badge key={`${option.name}-${attr.key}`} variant="outline">
                              {attr.key}: {String(attr.value)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {product.description && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t('descriptionTitle')}</h3>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('featuresTitle')}</h3>
              {productFeatures.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('featuresEmpty')}</p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {productFeatures.map((feature) => (
                    <div key={`${feature.key}-${feature.value}`} className="flex items-center justify-between rounded-[0.75rem] bg-muted px-3 py-2">
                      <span className="font-medium">{feature.key}</span>
                      <span className="text-muted-foreground">{String(feature.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('optionAttributesTitle')}</h3>
              {optionAttributes.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('optionAttributesEmpty')}</p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {optionAttributes.map((feature) => (
                    <div key={`${selectedOption?.name || 'option'}-attr-${feature.key}`} className="flex items-center justify-between rounded-[0.75rem] bg-muted px-3 py-2">
                      <span className="font-medium">{feature.key}</span>
                      <span className="text-muted-foreground">{String(feature.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('optionFeaturesTitle')}</h3>
              {optionFeatures.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('optionFeaturesEmpty')}</p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {optionFeatures.map((feature) => (
                    <div key={`${selectedOption?.name || 'option'}-feature-${feature.key}`} className="flex items-center justify-between rounded-[0.75rem] bg-muted px-3 py-2">
                      <span className="font-medium">{feature.key}</span>
                      <span className="text-muted-foreground">{String(feature.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Box>
    </div>
  );
}
