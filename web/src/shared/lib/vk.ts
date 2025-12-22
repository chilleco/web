const getVkQueryParams = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    const search = window.location?.search;
    if (!search) {
        return null;
    }

    return new URLSearchParams(search);
};

export const isVkMiniApp = () => {
    const params = getVkQueryParams();
    if (!params) return false;

    if (!params.has('vk_user_id')) {
        return false;
    }

    if (!params.has('sign')) {
        return false;
    }

    return true;
};
