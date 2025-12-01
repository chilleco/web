export type SpaceEntityType = 'ooo' | 'ip' | 'fl' | 'smz';

export interface Space {
  id: number;
  title: string;
  link: string;
  logo?: string | null;
  description?: string | null;
  entity?: SpaceEntityType | null;
  director?: string | null;
  inn?: string | null;
  margin?: number | null;
  phone?: string | null;
  mail?: string | null;
  telegram?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  users?: number[];
  user?: number | null;
  created?: number;
  updated?: number;
}

export interface GetSpacesParams {
  id?: number | number[];
  link?: string;
  attached?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  attach?: boolean;
}

export interface SaveSpaceRequest {
  id?: number;
  link?: string;
  title?: string;
  logo?: string | null;
  description?: string | null;
  entity?: SpaceEntityType | null;
  director?: string | null;
  inn?: string | null;
  margin?: number | null;
  phone?: string | null;
  mail?: string | null;
  telegram?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  status?: number | null;
}

export interface SaveSpaceResponse {
  id: number;
  new: boolean;
  space: Space;
}

export interface GetSpacesResponse {
  spaces: Space[];
  count?: number | null;
}
