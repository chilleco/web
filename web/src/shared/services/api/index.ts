/**
 * API module exports
 * Centralized exports for all API functions
 */

// Export the main API client
export { api, apiClient, ApiError } from './client';
export type { ApiRequestOptions, ApiResponse } from './client';

// Export authentication functions
export * from './auth';
