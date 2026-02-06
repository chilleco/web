export const APP_ENVS = ["local", "test", "dev", "pre", "prod"] as const;

export type AppEnv = (typeof APP_ENVS)[number];

const APP_ENV_SET: ReadonlySet<AppEnv> = new Set(APP_ENVS);

export const resolveAppEnv = (value: string | undefined | null): AppEnv => {
    const normalized = (value ?? "test").trim().toLowerCase();
    if (APP_ENV_SET.has(normalized as AppEnv)) {
        return normalized as AppEnv;
    }
    return "test";
};

export const getPublicAppEnv = (): AppEnv => resolveAppEnv(process.env.NEXT_PUBLIC_ENV);

export const isNonProdAppEnv = (env: AppEnv): boolean =>
    env === "local" || env === "test" || env === "dev";

export const isProdLikeAppEnv = (env: AppEnv): boolean => env === "pre" || env === "prod";
