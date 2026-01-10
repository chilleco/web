/**
 * API Configuration
 *
 * This file contains configuration for API behavior, including fallback handling
 * when the backend is unavailable.
 *
 * ## Features
 *
 * ### Automatic Fallback System
 * - **Local Mode**: Automatically uses mock data when API calls fail
 * - **Production Mode**: Lets API errors bubble up for proper error handling
 * - **Configurable**: Can be controlled via environment variables
 *
 * ### Environment Variables
 * ```bash
 * # API Configuration
 * NEXT_PUBLIC_API=http://api:5000/                    # API base URL
 * NEXT_PUBLIC_API_TIMEOUT=10000                       # Request timeout (ms)
 * NEXT_PUBLIC_USE_MOCK_FALLBACK=true                  # Force mock fallback
 * NEXT_PUBLIC_MOCK_API_DELAY=500                      # Mock response delay (ms)
 * NEXT_PUBLIC_ENV=local                               # App env: local/test/dev/pre/prod
 * ```
 *
 * ### Usage Examples
 *
 * #### In Local mode
 * When `NEXT_PUBLIC_ENV=local`, the app will:
 * 1. Try to call the real API first
 * 2. If it fails, automatically use mock data
 * 3. Show warnings in the console
 * 4. Continue working normally
 *
 * #### In Production
 * When `NEXT_PUBLIC_ENV=prod`, the app will:
 * 1. Call the real API only
 * 2. Let errors bubble up for proper error boundaries
 * 3. Not show API warnings
 *
 * ### Mock Data
 * Mock data is provided for:
 * - **Categories**: 3 sample categories (Technology, Business, Lifestyle)
 * - **Posts**: 3 sample posts with images and content
 * - **Filtering**: Supports category, locale, and search filtering
 * - **Pagination**: Supports offset/limit pagination
 *
 * ### API Endpoints Expected
 * The system expects these backend endpoints:
 * - `POST /categories/get/` - Get categories with filtering or by id/url
 * - `POST /categories/save/` - Create or update a category
 * - `POST /categories/rm/` - Delete a category
 * - `POST /posts/get/` - Get posts with filtering
 *
 * ### Configuration API
 * ```typescript
 * import { shouldUseMockFallback, logApiWarning, addMockDelay } from '@/shared/config/api';
 *
 * // Check if mock fallback is enabled
 * if (shouldUseMockFallback()) {
 *   // Try real API, fallback to mock on error
 * }
 *
 * // Log warnings (only in development)
 * logApiWarning('API call failed', error);
 *
 * // Add artificial delay for testing
 * await addMockDelay();
 * ```
 *
 * This system ensures the frontend works reliably during development even when
 * the backend isn't available, while maintaining proper error handling in production.
 */

const envName = (process.env.NEXT_PUBLIC_ENV || '').toUpperCase();
const mockFallbackEnv = process.env.NEXT_PUBLIC_USE_MOCK_FALLBACK;
const isLocalEnv = envName === 'LOCAL' || envName === '';
const isDevEnv = envName === 'DEV';
const isNonProdEnv = isLocalEnv || isDevEnv;

// Environment-based configuration
export const API_CONFIG = {
  // Base URL for API requests
  baseUrl: process.env.NEXT_PUBLIC_API || 'http://api:5000/',

  // Timeout for API requests (in milliseconds)
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000', 10),

  // Whether to use mock data as fallback when API fails
  // Default to true only in LOCAL mode unless explicitly disabled
  useMockFallback: mockFallbackEnv === 'true' || (isLocalEnv && mockFallbackEnv !== 'false'),

  // Whether to show API warnings in console
  showApiWarnings: isNonProdEnv,

  // Mock data configuration
  mock: {
    // Number of mock posts to generate
    postsCount: 3,

    // Number of mock categories to generate
    categoriesCount: 3,

    // Delay for mock API responses (in milliseconds)
    delay: parseInt(process.env.NEXT_PUBLIC_MOCK_API_DELAY || '0', 10)
  }
} as const;

/**
 * Check if mock fallback should be used
 */
export function shouldUseMockFallback(): boolean {
  return API_CONFIG.useMockFallback;
}

/**
 * Log API warnings if enabled
 */
export function logApiWarning(message: string, error?: unknown): void {
  if (API_CONFIG.showApiWarnings) {
    console.warn(`[API] ${message}`, error);
  }
}

/**
 * Add artificial delay for mock responses (useful for testing loading states)
 */
export async function addMockDelay(): Promise<void> {
  if (API_CONFIG.mock.delay > 0) {
    await new Promise(resolve => setTimeout(resolve, API_CONFIG.mock.delay));
  }
}
