'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ProductCard } from '@/widgets/product-card';
import { useToastActions } from '@/shared/hooks/useToast';
import { useAppSelector, useAppDispatch } from '@/shared/stores/store';
import { toggleCartItem, selectCartItemsAsSet } from '@/features/cart';
import { toggleFavorite, selectFavoriteItemsAsSet } from '@/features/favorites';
import { getProducts, Product } from '@/entities/product';
import { SearchFilters } from '@/shared/ui/search';
import { AlertIcon, LoadingIcon, SearchIcon } from '@/shared/ui/icons';
import { Button } from '@/shared/ui/button';

interface ProductsGridProps {
    onProductAddToCart?: (productId: number) => void;
    onProductToggleFavorite?: (productId: number) => void;
    cartItems?: Set<number>;
    favoriteItems?: Set<number>;
    searchQuery?: string;
    filters?: SearchFilters;
}

const PRODUCTS_LIMIT = 12;

export function ProductsGrid({
    onProductAddToCart,
    onProductToggleFavorite,
    cartItems,
    favoriteItems,
    searchQuery,
    filters,
}: ProductsGridProps) {
    const { success, error: showError } = useToastActions();
    const tCatalog = useTranslations('catalog.product');
    const dispatch = useAppDispatch();

    const reduxCartItems = useAppSelector(selectCartItemsAsSet);
    const reduxFavoriteItems = useAppSelector(selectFavoriteItemsAsSet);

    const finalCartItems = cartItems || reduxCartItems || new Set<number>();
    const finalFavoriteItems = favoriteItems || reduxFavoriteItems || new Set<number>();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const categoryFilter = useMemo(() => {
        if (!filters) return undefined;
        const { category } = filters;
        return typeof category === 'string' ? category : undefined;
    }, [filters]);

    const loadProducts = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError(null);

            const response = await getProducts({
                search: searchQuery || undefined,
                category: categoryFilter,
                limit: PRODUCTS_LIMIT,
            });

            setProducts(response.products);
        } catch (err) {
            const message = err instanceof Error ? err.message : tCatalog('loadError');
            setLoadError(message);
            showError(message);
        } finally {
            setLoading(false);
        }
    }, [categoryFilter, searchQuery, showError, tCatalog]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const handleAddToCart = useCallback((product: Product) => {
        success(tCatalog('addedToCartToast', { title: product.title }));

        if (onProductAddToCart) {
            onProductAddToCart(product.id);
        } else {
            dispatch(toggleCartItem(product.id));
        }
    }, [dispatch, onProductAddToCart, success, tCatalog]);

    const handleToggleFavorite = useCallback((product: Product) => {
        success(tCatalog('favoriteToggledToast', { title: product.title }));

        if (onProductToggleFavorite) {
            onProductToggleFavorite(product.id);
        } else {
            dispatch(toggleFavorite(product.id));
        }
    }, [dispatch, onProductToggleFavorite, success, tCatalog]);

    if (loading && products.length === 0) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {Array.from({ length: PRODUCTS_LIMIT }).map((_, index) => (
                    <div key={index} className="animate-pulse space-y-3">
                        <div className="bg-muted h-64 rounded-[1rem]" />
                        <div className="bg-muted h-4 w-3/4 rounded-full" />
                        <div className="bg-muted h-3 w-1/2 rounded-full" />
                    </div>
                ))}
            </div>
        );
    }

    if (loadError && products.length === 0) {
        return (
            <div className="text-center py-12 space-y-4">
                <AlertIcon size={48} className="mx-auto text-destructive" />
                <div className="space-y-2">
                    <p className="text-lg font-semibold">{tCatalog('loadError')}</p>
                    <p className="text-sm text-muted-foreground">{loadError}</p>
                </div>
                <Button variant="secondary" onClick={loadProducts}>
                    <LoadingIcon size={16} className="mr-2" />
                    {tCatalog('retry')}
                </Button>
            </div>
        );
    }

    if (!loading && products.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground space-y-2">
                <SearchIcon size={48} className="mx-auto" />
                <p className="text-lg font-semibold">{tCatalog('empty')}</p>
                <p className="text-sm">{tCatalog('emptyHint')}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {products.map((product) => (
                <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onToggleFavorite={handleToggleFavorite}
                    isInCart={finalCartItems.has(product.id)}
                    isInFavorites={finalFavoriteItems.has(product.id)}
                />
            ))}
        </div>
    );
}
