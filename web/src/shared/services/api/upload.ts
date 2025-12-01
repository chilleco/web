import { api } from '@/shared/services/api/client';

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('data', file);

  const response = await api.post<{ url: string }>('/upload/', formData);
  return response.url;
}
