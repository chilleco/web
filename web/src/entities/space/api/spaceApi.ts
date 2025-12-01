import { API_ENDPOINTS } from '@/shared/constants';
import { api } from '@/shared/services/api/client';
import type {
  GetSpacesParams,
  GetSpacesResponse,
  SaveSpaceRequest,
  SaveSpaceResponse,
  Space
} from '../model/space';

type RawSpacesResponse = {
  spaces: Space | Space[];
  count?: number | null;
};

const normalizeSpaces = (response: RawSpacesResponse): GetSpacesResponse => {
  const spacesArray = Array.isArray(response.spaces)
    ? response.spaces
    : response.spaces
      ? [response.spaces]
      : [];

  return {
    spaces: spacesArray,
    count: response.count ?? spacesArray.length
  };
};

export async function getSpaces(params: GetSpacesParams = {}): Promise<GetSpacesResponse> {
  const response = await api.post<RawSpacesResponse>(API_ENDPOINTS.SPACES.GET, params);
  return normalizeSpaces(response);
}

export async function getSpaceByLink(link: string): Promise<Space> {
  const response = await getSpaces({ link, attach: true });
  if (!response.spaces.length) {
    throw new Error('Space not found');
  }
  return response.spaces[0];
}

export async function saveSpace(data: SaveSpaceRequest): Promise<SaveSpaceResponse> {
  return api.post<SaveSpaceResponse>(API_ENDPOINTS.SPACES.SAVE, data);
}

export async function deleteSpace(id: number): Promise<void> {
  await api.post(API_ENDPOINTS.SPACES.DELETE, { id });
}
