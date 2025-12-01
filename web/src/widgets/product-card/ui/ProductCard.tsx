'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { ShoppingIcon, TagIcon, TrendingIcon, StarIcon, ReviewsIcon } from '@/shared/ui/icons';
import { Product, ProductFeature } from '@/entities/product';

interface ProductCardProps {
    product: Product;
    onAddToCart?: (product: Product) => void;
    onToggleFavorite?: (product: Product) => void;
    isInCart?: boolean;
    isInFavorites?: boolean;
}

export function ProductCard({ product, onAddToCart, onToggleFavorite, isInCart = false, isInFavorites = false }: ProductCardProps) {
    const t = useTranslations('catalog.product');
    const tSystem = useTranslations('system');
    const priceFrom = typeof product.priceFrom === 'number' ? product.priceFrom : product.price || 0;
    const finalPrice = typeof product.finalPriceFrom === 'number' ? product.finalPriceFrom : priceFrom;
    const primaryOption = product.options?.[0];
    const pricePrefix = product.options?.length ? t('priceFrom') : undefined;
    const inStock = typeof product.inStock === 'boolean' ? product.inStock : (product.options?.some((option) => option.inStock !== false) ?? true);
    const productImages = (product.images && product.images.length > 0)
        ? product.images
        : (primaryOption?.images || []);

    // Like functionality - in production this would come from props or global state
    const [isLiked, setIsLiked] = useState(isInFavorites);

    useEffect(() => {
        setIsLiked(isInFavorites);
    }, [isInFavorites]);

    const handleLikeClick = (id?: string | number) => {
        // In production, this would call an API to like/unlike the product
        console.log('Like clicked for product:', id);
        setIsLiked(prev => !prev);

        // Call the prop callback if provided
        if (onToggleFavorite) {
            onToggleFavorite(product);
        }

        // TODO: Integrate with API
        // Example:
        // await toggleProductLike(product.id);
    };

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

    const formatFeatureValue = (feature: ProductFeature) => {
        if (feature.valueType === 'boolean') {
            return feature.value ? tSystem('yes') : tSystem('no');
        }
        return String(feature.value);
    };

    const combinedFeatures = [
        ...(product.features || []),
        ...(primaryOption?.attributes || []),
        ...(primaryOption?.features || []),
    ];

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
            price={finalPrice}
            basePrice={priceFrom}
            pricePrefix={pricePrefix}
            currency={product.currency}
            actions={actions}
            variant="product"
            showLikeButton={true}
            isLiked={isLiked}
            onLikeClick={handleLikeClick}
            id={product.id}
            href={productLink}
        />
    );
}
