'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProducts, type Product } from '../api/productApi';

interface UseProductsByIdsResult {
    products: Product[];
    loading: boolean;
    error: string | null;
    reload: () => void;
    hasIds: boolean;
}

interface UseProductsByIdsOptions {
    fallbackError?: string;
}

export function useProductsByIds(ids: number[], options?: UseProductsByIdsOptions): UseProductsByIdsResult {
    const fallbackError = options?.fallbackError || null;
    const normalizedIds = useMemo(
        () =>
            Array.from(new Set(ids.filter((id) => Number.isFinite(id)).map((id) => Number(id)))).sort(
                (a, b) => a - b
            ),
        [ids]
    );
    const fetchKey = useMemo(() => (normalizedIds.length ? normalizedIds.join('-') : 'empty'), [normalizedIds]);

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const requestedRef = useRef<string | null>(null);
    const inFlightRef = useRef<string | null>(null);
    const latestKeyRef = useRef<string | null>(null);

    const loadProducts = useCallback(
        async (key: string, force = false) => {
            if (normalizedIds.length === 0) {
                setProducts([]);
                setError(null);
                requestedRef.current = key;
                latestKeyRef.current = key;
                setLoading(false);
                return;
            }

            if (!force) {
                if (inFlightRef.current === key) return;
                if (requestedRef.current === key) return;
            }

            requestedRef.current = key;
            inFlightRef.current = key;
            latestKeyRef.current = key;

            setLoading(true);
            setError(null);

            try {
                const response = await getProducts({ id: normalizedIds });
                if (latestKeyRef.current !== key) return;
                setProducts(response.products);
            } catch (err) {
                if (latestKeyRef.current !== key) return;
                const message = err instanceof Error ? err.message : fallbackError;
                setError(message || fallbackError);
            } finally {
                if (inFlightRef.current === key) {
                    inFlightRef.current = null;
                }
                if (latestKeyRef.current === key) {
                    setLoading(false);
                }
            }
        },
        [fallbackError, normalizedIds]
    );

    useEffect(() => {
        const key = fetchKey;
        void loadProducts(key);
    }, [fetchKey, loadProducts]);

    const reload = useCallback(() => {
        void loadProducts(fetchKey, true);
    }, [fetchKey, loadProducts]);

    return {
        products,
        loading,
        error,
        reload,
        hasIds: normalizedIds.length > 0,
    };
}
