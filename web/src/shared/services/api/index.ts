/**
 * API module exports
 * Centralized exports for all API functions
 */

// Export the main API client
export { api, apiClient, ApiError, API_BASE_URL } from './client';
export type { ApiRequestOptions, ApiResponse } from './client';

// Export authentication functions
export * from './auth';

// Common API utilities
/**
 * Health check endpoint
 */
export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
    const { api } = await import('./client');
    return api.get('/health/');
}
