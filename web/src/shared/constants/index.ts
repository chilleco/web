// Application constants

// Routes
export const ROUTES = {
  HOME: '/',
  POSTS: '/posts',
  POST_DETAIL: (id: string) => `/posts/${id}`,
  PROFILE: '/profile',
  SETTINGS: '/settings',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
  },
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  USER_SETTINGS: 'user-settings',
  AUTH_TOKEN: 'authToken',
  SESSION_TOKEN: 'sessionToken',
  REFRESH_TOKEN: 'refreshToken',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login/',
    REGISTER: '/auth/register/',
    REFRESH: '/auth/refresh/',
    LOGOUT: '/auth/logout/',
  },
  USERS: {
    GET: '/users/get/',
    ME: '/users/get/',
    UPDATE: '/users/save/',
    SAVE: '/users/save/',
    TOKEN: '/users/token/',
    AUTH: '/users/auth/',
    EXIT: '/users/exit/',
    APP_TG: '/users/app/tg/',
    APP_VK: '/users/app/vk/',
    APP_MAX: '/users/app/max/',
    SOCIAL: '/users/social/',
    FRENS: '/users/frens/',
    SHARE_TG: '/users/share/tg/',
  },
  POSTS: {
    LIST: '/posts/',
    GET: '/posts/get/',
    CREATE: '/posts/',
    UPDATE: (id: number) => `/posts/${id}/`,
    DELETE: (id: number) => `/posts/${id}/`,
  },
  CATEGORIES: {
    LIST: '/categories/get/',
    TREE: '/categories/tree/',
    GET: (id: number) => '/categories/get/',
    CREATE: '/categories/save/',
    UPDATE: (id: number) => '/categories/save/',
    DELETE: '/categories/rm/',
  },
  SPACES: {
    GET: '/spaces/get/',
    SAVE: '/spaces/save/',
    DELETE: '/spaces/rm/',
  },
  TASKS: {
    GET: '/tasks/get/',
    CHECK: '/tasks/check/',
    SAVE: '/tasks/save/',
  },
  FEEDBACK: {
    SAVE: '/feedback/save/',
    GET: '/feedback/get/',
    RM: '/feedback/rm/',
  },
  ADMIN: {
    STATS: '/admin/stats/',
    ACTIVITY: '/admin/activity/',
  },
} as const;

// Status Codes
export const STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Theme Values
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

// Language Codes
export const LANGUAGES = {
  EN: 'en',
  RU: 'ru',
  ZH: 'zh',
  ES: 'es',
  AR: 'ar',
} as const;

// Toast Types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading',
} as const;
