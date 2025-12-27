type SearchParamsLike = {
    get: (key: string) => string | null;
};

export const normalizeUtm = (value?: string | null): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.toLowerCase() === 'other') return null;
    return trimmed;
};

export const getUtmFromSearchParams = (params?: SearchParamsLike | null): string | null => {
    if (!params) return null;
    return normalizeUtm(params.get('utm') || params.get('vk_ref'));
};
