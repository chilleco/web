'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { PageHeader } from '@/shared/ui/page-header';
import { Box } from '@/shared/ui/box';
import { Button } from '@/shared/ui/button';
import { ButtonGroup } from '@/shared/ui/button-group';
import { IconButton } from '@/shared/ui/icon-button';
import { Badge } from '@/shared/ui/badge';
import { AlertIcon, HeartIcon, LoadingIcon, RefreshIcon, ShoppingIcon } from '@/shared/ui/icons';
import { ProductCard } from '@/widgets/product-card';
import { useToastActions } from '@/shared/hooks/useToast';
import { useAppDispatch, useAppSelector } from '@/shared/stores/store';
import { selectFavoriteItemsAsSet, toggleFavorite } from '@/features/favorites';
import { selectCartItemsAsSet, toggleCartItem } from '@/features/cart';
import { useProductsByIds, type Product } from '@/entities/product';

export default function FavoritesPage() {
    const tFavorites = useTranslations('catalog.pages.favorites');
    const tCartPage = useTranslations('catalog.pages.cart');
    const tProduct = useTranslations('catalog.product');
    const tSystem = useTranslations('system');
    const router = useRouter();
    const dispatch = useAppDispatch();
    const favoritesSet = useAppSelector(selectFavoriteItemsAsSet);
    const cartSet = useAppSelector(selectCartItemsAsSet);
    const favoriteIds = useMemo(() => Array.from(favoritesSet), [favoritesSet]);
    const { products, loading, error, reload, hasIds } = useProductsByIds(favoriteIds, {
        fallbackError: tProduct('loadError'),
    });
    const { success, info, error: showError } = useToastActions();

    useEffect(() => {
        if (error) {
            showError(error);
        }
    }, [error, showError]);

    const handleOpenCatalog = () => router.push({ pathname: '/catalog' });
    const handleOpenCart = () => router.push({ pathname: '/cart' });

    const handleToggleFavorite = (product: Product) => {
        dispatch(toggleFavorite(product.id));
        info(tProduct('favoriteToggledToast', { title: product.title }));
    };

    const handleToggleCart = (product: Product) => {
        const alreadyInCart = cartSet.has(product.id);
        dispatch(toggleCartItem(product.id));
        if (alreadyInCart) {
            info(tCartPage('removedToast', { title: product.title }));
        } else {
            success(tProduct('addedToCartToast', { title: product.title }));
        }
    };

    const showSkeleton = loading && products.length === 0;
    const showErrorState = !!error && products.length === 0 && !loading;
    const showEmpty = !loading && products.length === 0 && !error;

    return (
        <div className="container mx-auto px-4 py-10 space-y-6">
            <PageHeader
                icon={<HeartIcon size={24} />}
                iconClassName="bg-pink-500/15 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400"
                title={tFavorites('title')}
                description={tFavorites('description')}
                actions={
                    <ButtonGroup>
                        <IconButton
                            variant="outline"
                            icon={<RefreshIcon size={14} />}
                            onClick={reload}
                            responsive
                            disabled={loading || !hasIds}
                        >
                            {tSystem('refresh')}
                        </IconButton>
                        <IconButton
                            variant="outline"
                            icon={<ShoppingIcon size={14} />}
                            onClick={handleOpenCart}
                            responsive
                        >
                            {tCartPage('openButton')}
                        </IconButton>
                    </ButtonGroup>
                }
            />

            {showErrorState ? (
                <Box className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-destructive">
                        <AlertIcon size={18} />
                        <p className="font-medium">{tProduct('loadError')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={reload} className="cursor-pointer">
                            <RefreshIcon size={14} />
                            {tSystem('refresh')}
                        </Button>
                        <Button variant="outline" onClick={handleOpenCatalog} className="cursor-pointer">
                            <ShoppingIcon size={14} />
                            {tFavorites('openCatalog')}
                        </Button>
                    </div>
                </Box>
            ) : null}

            {showSkeleton ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                    {Array.from({ length: Math.max(3, Math.min(6, Math.max(1, favoriteIds.length))) }).map(
                        (_, index) => (
                            <div key={index} className="animate-pulse space-y-3">
                                <div className="bg-muted h-64 rounded-[1rem]" />
                                <div className="bg-muted h-4 w-3/4 rounded-full" />
                                <div className="bg-muted h-3 w-1/2 rounded-full" />
                            </div>
                        )
                    )}
                </div>
            ) : null}

            {showEmpty ? (
                <Box className="flex flex-col gap-4">
                    <div className="space-y-2">
                        <p className="text-lg font-semibold">{tFavorites('emptyTitle')}</p>
                        <p className="text-muted-foreground text-sm">{tFavorites('emptyDescription')}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={handleOpenCatalog} className="cursor-pointer">
                            <ShoppingIcon size={14} />
                            {tFavorites('openCatalog')}
                        </Button>
                        <Button variant="outline" onClick={handleOpenCart} className="cursor-pointer">
                            <ShoppingIcon size={14} />
                            {tFavorites('openCart')}
                        </Button>
                    </div>
                </Box>
            ) : null}

            {!showSkeleton && !showEmpty && products.length > 0 ? (
                <>
                    <Box className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="rounded-[0.75rem] px-3 py-1">
                                {tFavorites('countLabel', { count: products.length })}
                            </Badge>
                            <Badge variant="outline" className="rounded-[0.75rem] px-3 py-1">
                                {tFavorites('description')}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleOpenCatalog} variant="secondary" className="cursor-pointer">
                                <ShoppingIcon size={14} />
                                {tFavorites('openCatalog')}
                            </Button>
                            <Button onClick={handleOpenCart} variant="outline" className="cursor-pointer">
                                <ShoppingIcon size={14} />
                                {tFavorites('openCart')}
                            </Button>
                            <Button
                                onClick={reload}
                                variant="ghost"
                                disabled={loading || !hasIds}
                                className="cursor-pointer"
                            >
                                {loading ? <LoadingIcon size={14} /> : <RefreshIcon size={14} />}
                                {tSystem('refresh')}
                            </Button>
                        </div>
                    </Box>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onAddToCart={handleToggleCart}
                                onToggleFavorite={handleToggleFavorite}
                                isInCart={cartSet.has(product.id)}
                                isInFavorites={favoritesSet.has(product.id)}
                            />
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );
}
