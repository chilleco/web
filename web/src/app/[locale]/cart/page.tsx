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
import { selectCartItemsAsSet, toggleCartItem } from '@/features/cart';
import { selectFavoriteItemsAsSet, toggleFavorite } from '@/features/favorites';
import { useProductsByIds, type Product } from '@/entities/product';

export default function CartPage() {
    const tCartPage = useTranslations('catalog.pages.cart');
    const tFavoritesPage = useTranslations('catalog.pages.favorites');
    const tProduct = useTranslations('catalog.product');
    const tSystem = useTranslations('system');
    const router = useRouter();
    const dispatch = useAppDispatch();
    const cartSet = useAppSelector(selectCartItemsAsSet);
    const favoritesSet = useAppSelector(selectFavoriteItemsAsSet);
    const cartIds = useMemo(() => Array.from(cartSet), [cartSet]);
    const { products, loading, error, reload, hasIds } = useProductsByIds(cartIds, {
        fallbackError: tProduct('loadError'),
    });
    const { success, info, error: showError } = useToastActions();

    useEffect(() => {
        if (error) {
            showError(error);
        }
    }, [error, showError]);

    const handleOpenCatalog = () => router.push({ pathname: '/catalog' });
    const handleOpenFavorites = () => router.push({ pathname: '/favorites' });

    const handleToggleCart = (product: Product) => {
        const alreadyInCart = cartSet.has(product.id);
        dispatch(toggleCartItem(product.id));
        if (alreadyInCart) {
            info(tCartPage('removedToast', { title: product.title }));
        } else {
            success(tProduct('addedToCartToast', { title: product.title }));
        }
    };

    const handleToggleFavorite = (product: Product) => {
        dispatch(toggleFavorite(product.id));
        info(tProduct('favoriteToggledToast', { title: product.title }));
    };

    const showSkeleton = loading && products.length === 0;
    const showErrorState = !!error && products.length === 0 && !loading;
    const showEmpty = !loading && products.length === 0 && !error;

    return (
        <div className="container mx-auto px-4 py-10 space-y-6">
            <PageHeader
                icon={<ShoppingIcon size={24} />}
                iconClassName="bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                title={tCartPage('title')}
                description={tCartPage('description')}
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
                            icon={<HeartIcon size={14} />}
                            onClick={handleOpenFavorites}
                            responsive
                        >
                            {tFavoritesPage('openButton')}
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
                            {tCartPage('openCatalog')}
                        </Button>
                    </div>
                </Box>
            ) : null}

            {showSkeleton ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                    {Array.from({ length: Math.max(3, Math.min(6, Math.max(1, cartIds.length))) }).map(
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
                        <p className="text-lg font-semibold">{tCartPage('emptyTitle')}</p>
                        <p className="text-muted-foreground text-sm">{tCartPage('emptyDescription')}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={handleOpenCatalog} className="cursor-pointer">
                            <ShoppingIcon size={14} />
                            {tCartPage('openCatalog')}
                        </Button>
                        <Button variant="outline" onClick={handleOpenFavorites} className="cursor-pointer">
                            <HeartIcon size={14} />
                            {tCartPage('openFavorites')}
                        </Button>
                    </div>
                </Box>
            ) : null}

            {!showSkeleton && !showEmpty && products.length > 0 ? (
                <>
                    <Box className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="rounded-[0.75rem] px-3 py-1">
                                {tCartPage('countLabel', { count: products.length })}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleOpenCatalog} variant="secondary" className="cursor-pointer">
                                <ShoppingIcon size={14} />
                                {tCartPage('openCatalog')}
                            </Button>
                            <Button onClick={handleOpenFavorites} variant="outline" className="cursor-pointer">
                                <HeartIcon size={14} />
                                {tCartPage('openFavorites')}
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
