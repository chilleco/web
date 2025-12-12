import { api, ApiError } from '@/shared/services/api/client';

const extractErrorDetail = (error: ApiError): string | undefined => {
  const detail = error.data && typeof error.data === 'object'
    ? (error.data as { detail?: unknown }).detail
    : undefined;

  if (typeof detail === 'string') {
    return detail;
  }

  if (detail !== null && detail !== undefined) {
    return String(detail);
  }

  return undefined;
};

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('data', file);

  try {
    const response = await api.post<{ url: string }>('/upload/', formData, {
      suppressGlobalErrorHandler: true,
    });

    return response.url;
  } catch (error) {
    if (error instanceof ApiError) {
      const detailMessage = extractErrorDetail(error);
      throw new ApiError(error.status, detailMessage || error.message, error.data);
    }

    throw error;
  }
}
