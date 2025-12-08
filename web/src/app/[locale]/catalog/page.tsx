'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { PageHeader } from '@/shared/ui/page-header';
import { ButtonGroup } from '@/shared/ui/button-group';
import { IconButton } from '@/shared/ui/icon-button';
import { Badge } from '@/shared/ui/badge';
import { CatalogIcon, HeartIcon, ShoppingIcon } from '@/shared/ui/icons';
import { ProductsGrid } from '@/widgets/products-grid';
import { FiltersSidebar } from '@/widgets/filters-sidebar';
import { Search, SearchFilters, SearchFilterConfig } from '@/shared/ui/search';
import { useAppSelector, useAppDispatch } from '@/shared/stores/store';
import { toggleCartItem, selectCartItemsAsSet } from '@/features/cart';
import { toggleFavorite, selectFavoriteItemsAsSet } from '@/features/favorites';
import { selectSelectedSpace } from '@/features/spaces/stores/spaceSelectionSlice';
import { getSpaceByLink, type Space } from '@/entities/space';
import { useToastActions } from '@/shared/hooks/useToast';

export default function CatalogPage() {
    const t = useTranslations('navigation');
    const tCatalog = useTranslations('catalog.product');
    const tCatalogPage = useTranslations('catalog');
    const tSearch = useTranslations('search');
    const tSystem = useTranslations('system');
    const router = useRouter();

    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState<SearchFilters>({});
    const [appliedQuery, setAppliedQuery] = useState('');
    const [appliedFilters, setAppliedFilters] = useState<SearchFilters>({});

    // Redux state
    const dispatch = useAppDispatch();
    const cartItems = useAppSelector(selectCartItemsAsSet);
    const favoriteItems = useAppSelector(selectFavoriteItemsAsSet);
    const selectedSpace = useAppSelector(selectSelectedSpace);
    const { error: showError } = useToastActions();
    const [dealer, setDealer] = useState<Space | null>(null);
    const [dealerLoading, setDealerLoading] = useState(false);
    const fetchKeyRef = useRef<string | null>(null);

    // Configure inline filters (sort)
    const inlineFilters: SearchFilterConfig[] = [
        {
            type: 'sort',
            label: tSearch('sortBy'),
            key: 'sort',
            options: [
                { value: 'featured', label: tSearch('sortOptions.featured') },
                { value: 'priceAsc', label: tSearch('sortOptions.priceAsc') },
                { value: 'priceDesc', label: tSearch('sortOptions.priceDesc') },
                { value: 'newest', label: tSearch('sortOptions.newest') },
                { value: 'popular', label: tSearch('sortOptions.popular') }
            ]
        }
    ];

    // Configure popup filters (price range, promo code)
    const popupFilters: SearchFilterConfig[] = [
        {
            type: 'price-range',
            label: tSearch('priceRange'),
            key: 'priceRange'
        },
        {
            type: 'promo-code',
            label: tSearch('promoCode'),
            key: 'promoCode',
            placeholder: tSearch('promoPlaceholder')
        }
    ];

    // Handle search
    const handleSearch = useCallback((searchQuery: string, searchFilters: SearchFilters) => {
        const nextQuery = searchQuery ?? query;
        const nextFilters = searchFilters ?? filters;

        setQuery(nextQuery);
        setFilters(nextFilters);
        setAppliedQuery(nextQuery);
        setAppliedFilters(nextFilters);
    }, [filters, query]);

    // Handle favorites and cart actions
    const handleOpenFavorites = useCallback(() => {
        router.push({ pathname: '/favorites' });
    }, [router]);

    const handleOpenCart = useCallback(() => {
        router.push({ pathname: '/cart' });
    }, [router]);

    // Handle product interactions from ProductsGrid
    const handleProductAddToCart = (productId: number) => {
        dispatch(toggleCartItem(productId));
    };

    const handleProductToggleFavorite = (productId: number) => {
        dispatch(toggleFavorite(productId));
    };

    const loadDealer = useCallback(
        async (link: string) => {
            setDealerLoading(true);
            try {
                const data = await getSpaceByLink(link);
                setDealer(data);
            } catch (err) {
                const message = err instanceof Error ? err.message : tSystem('error');
                showError(message);
                setDealer(null);
            } finally {
                setDealerLoading(false);
            }
        },
        [showError, tSystem]
    );

    useEffect(() => {
        if (!selectedSpace?.link) {
            setDealer(null);
            fetchKeyRef.current = null;
            return;
        }
        const fetchKey = `dealer-${selectedSpace.link}`;
        if (fetchKeyRef.current === fetchKey) return;
        fetchKeyRef.current = fetchKey;
        void loadDealer(selectedSpace.link);
    }, [loadDealer, selectedSpace?.link]);

    const headerIcon = useMemo(() => {
        if (dealer?.logo) {
            return (
                <div className="relative h-10 w-10 rounded-[0.75rem] overflow-hidden bg-muted">
                    <Image
                        src={dealer.logo}
                        alt={dealer.title}
                        fill
                        sizes="40px"
                        className="object-cover"
                    />
                </div>
            );
        }
        return <CatalogIcon size={24} />;
    }, [dealer?.logo, dealer?.title]);

    const headerTitle = dealer?.title || t('catalog');
    const headerDescription = dealer?.description || tCatalogPage('description');

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    <PageHeader
                        icon={headerIcon}
                        iconClassName="bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                        title={headerTitle}
                        description={dealerLoading ? tSystem('loading') : headerDescription}
                        actions={
                            <ButtonGroup>
                                <IconButton
                                    variant="outline"
                                    icon={<HeartIcon size={16} />}
                                    onClick={handleOpenFavorites}
                                    responsive
                                    className="relative"
                                >
                                    {tCatalog('favorite')}
                                    {favoriteItems.size > 0 && (
                                        <Badge
                                            variant="destructive"
                                            className="absolute -top-1 -right-1 min-w-[1rem] h-4 flex items-center justify-center p-0 text-[10px] text-white bg-red-500 border-red-500 pointer-events-none z-10"
                                        >
                                            {favoriteItems.size}
                                        </Badge>
                                    )}
                                </IconButton>

                                <IconButton
                                    variant="outline"
                                    icon={<ShoppingIcon size={16} />}
                                    onClick={handleOpenCart}
                                    responsive
                                    className="relative"
                                >
                                    {tCatalog('cart')}
                                    {cartItems.size > 0 && (
                                        <Badge
                                            variant="destructive"
                                            className="absolute -top-1 -right-1 min-w-[1rem] h-4 flex items-center justify-center p-0 text-[10px] text-white bg-red-500 border-red-500 pointer-events-none z-10"
                                        >
                                            {cartItems.size}
                                        </Badge>
                                    )}
                                </IconButton>
                            </ButtonGroup>
                        }
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Advanced Filters Sidebar */}
                        <div className="lg:col-span-1">
                            <FiltersSidebar className="sticky top-20" />
                        </div>

                        {/* Products Grid */}
                        <div className="lg:col-span-3">
                            {/* Advanced Search with Filters */}
                            <Search
                                value={query}
                                onChange={setQuery}
                                onSearch={handleSearch}
                                placeholder={tSearch('placeholder')}
                                filters={filters}
                                onFiltersChange={setFilters}
                                mode="inline-filters"
                                inlineFilters={inlineFilters}
                                popupFilters={popupFilters}
                                size="default"
                                className="mb-8"
                            />

                            {/* Products Grid */}
                            <ProductsGrid
                                searchQuery={appliedQuery}
                                filters={appliedFilters}
                                onProductAddToCart={handleProductAddToCart}
                                onProductToggleFavorite={handleProductToggleFavorite}
                                cartItems={cartItems}
                                favoriteItems={favoriteItems}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
