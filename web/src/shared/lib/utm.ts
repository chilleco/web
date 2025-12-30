type SearchParamsLike = {
    get: (key: string) => string | null;
};

export const normalizeUtm = (value?: string | null): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const lowered = trimmed.toLowerCase();
    if (lowered === 'null' || lowered === 'undefined') return null;
    return trimmed;
};

export const getUtmFromSearchParams = (params?: SearchParamsLike | null): string | null => {
    const searchUtm = normalizeUtm(params?.get('utm'));
    if (searchUtm) return searchUtm;

    if (typeof window !== 'undefined') {
        const hash = window.location.hash.replace(/^#/, '').trim();
        if (hash) {
            const hashParams = new URLSearchParams(hash);
            const hashUtm = normalizeUtm(hashParams.get('utm'));
            if (hashUtm) return hashUtm;
        }
    }

    return null;
};
