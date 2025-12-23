const NETWORKS = ['', 'web', 'tg', 'vk', 'g', 'fb', 'a', 'in', 'ig', 'max'] as const;

export type NetworkKey = Exclude<(typeof NETWORKS)[number], ''>;

export const get_network = (code?: string | number | null): number => {
  if (code === null || code === undefined) return 0;

  if (typeof code === 'number' && Number.isFinite(code)) {
    const normalized = Math.trunc(code);
    return normalized >= 0 && normalized < NETWORKS.length ? normalized : 0;
  }

  if (typeof code === 'string') {
    const normalized = code.trim();
    if (!normalized) return 0;
    const index = NETWORKS.indexOf(normalized as (typeof NETWORKS)[number]);
    return index >= 0 ? index : 0;
  }

  return 0;
};

export const getNetworkKey = (code?: number | null): NetworkKey | '' => {
  if (typeof code !== 'number' || !Number.isFinite(code)) return '';
  const normalized = Math.trunc(code);
  return (NETWORKS[normalized] ?? '') as NetworkKey | '';
};

export const NETWORK_KEYS = NETWORKS.filter((item) => item) as NetworkKey[];
