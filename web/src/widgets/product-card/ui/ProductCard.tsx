'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { ShoppingIcon, TagIcon, TrendingIcon, StarIcon, ReviewsIcon } from '@/shared/ui/icons';
import { Product } from '@/entities/product';
import { useAppSelector } from '@/shared/stores/store';
import { selectSelectedSpace } from '@/features/spaces/stores/spaceSelectionSlice';

interface ProductCardProps {
    product: Product;
    onAddToCart?: (product: Product) => void;
    onToggleFavorite?: (product: Product) => void;
    isInCart?: boolean;
    isInFavorites?: boolean;
    imageLoading?: 'lazy' | 'eager';
}

export function ProductCard({
    product,
    onAddToCart,
    onToggleFavorite,
    isInCart = false,
    isInFavorites = false,
    imageLoading = 'lazy'
}: ProductCardProps) {
    const t = useTranslations('catalog.product');
    const selectedSpace = useAppSelector(selectSelectedSpace);
    const rawPriceFrom = typeof product.priceFrom === 'number' ? product.priceFrom : product.price || 0;
    const rawFinalPrice = typeof product.finalPriceFrom === 'number' ? product.finalPriceFrom : rawPriceFrom;
    const marginFactor = 1 + Math.max(0, selectedSpace?.margin ?? 0) / 100;
    const priceFrom = Math.round(rawPriceFrom * marginFactor);
    const discountFactor = rawPriceFrom > 0 ? rawFinalPrice / rawPriceFrom : 1;
    const finalPrice = Math.round(priceFrom * discountFactor);
    const primaryOption = product.options?.[0];
    const hasPrice = priceFrom > 0 && finalPrice > 0;
    const pricePrefix = product.options?.length && hasPrice ? t('priceFrom') : undefined;
    const inStock = typeof product.inStock === 'boolean'
        ? product.inStock
        : (product.options?.some((option) => (option.stockCount ?? 0) > 0) ?? true);
    const productImages = (product.images && product.images.length > 0)
        ? product.images
        : (primaryOption?.images || []);

    // Prepare filters (category, rating and reviews in filters row)
    const filters = [];

    // Add category to filters if available
    if (product.category) {
        filters.push({
            icon: <TagIcon size={12} />,
            value: product.category
        });
    }

    if (product.rating) {
        filters.push({
            icon: <StarIcon size={12} />,
            value: product.rating
        });
    }

    if (product.ratingCount) {
        filters.push({
            icon: <ReviewsIcon size={12} />,
            value: product.ratingCount
        });
    }

    // Prepare tags (below description)
    const tags = [];

    if (product.isNew) {
        tags.push({
            icon: <TagIcon size={10} />,
            label: t('tagNew'),
            variant: 'success' as const
        });
    }

    if (product.isFeatured) {
        tags.push({
            icon: <TrendingIcon size={10} />,
            label: t('tagFeatured'),
            variant: 'warning' as const
        });
    }

    if (!inStock) {
        tags.push({
            label: t('tagOutOfStock'),
            variant: 'destructive' as const
        });
    }

    // Prepare actions - single button only
    const actions = onAddToCart ? (
        <Button
            variant={!inStock ? "outline" : isInCart ? "secondary" : "default"}
            size="sm"
            disabled={!inStock}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCart(product);
            }}
            className="w-full"
        >
            <ShoppingIcon size={12} />
            {!inStock ? t('unavailable') : isInCart ? t('inCart') : t('addToCart')}
        </Button>
    ) : null;

    const productLink = `/catalog/${product.url || product.id}`;

    return (
        <Card
            title={product.title}
            description={product.description}
            images={productImages}
            filters={filters}
            tags={tags}
            price={hasPrice ? finalPrice : undefined}
            basePrice={hasPrice && priceFrom > finalPrice ? priceFrom : undefined}
            pricePrefix={pricePrefix}
            currency={product.currency}
            actions={actions}
            variant="product"
            showLikeButton={Boolean(onToggleFavorite)}
            isLiked={isInFavorites}
            onLikeClick={onToggleFavorite ? () => onToggleFavorite(product) : undefined}
            id={product.id}
            href={productLink}
            imageLoading={imageLoading}
        />
    );
}
