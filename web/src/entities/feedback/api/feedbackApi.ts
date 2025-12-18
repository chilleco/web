import { apiWithoutGlobalErrors } from '@/shared/services/api/client';
import { API_ENDPOINTS } from '@/shared/constants';
import type {
  FeedbackGetRequest,
  FeedbackGetResponse,
  FeedbackSaveRequest,
  FeedbackSaveResponse,
} from '../model/feedback';

export async function saveFeedback(payload: FeedbackSaveRequest): Promise<FeedbackSaveResponse> {
  return apiWithoutGlobalErrors.post<FeedbackSaveResponse>(API_ENDPOINTS.FEEDBACK.SAVE, payload);
}

export async function getFeedback(payload: FeedbackGetRequest): Promise<FeedbackGetResponse> {
  return apiWithoutGlobalErrors.post<FeedbackGetResponse>(API_ENDPOINTS.FEEDBACK.GET, payload);
}

