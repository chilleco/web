export type FeedbackType = 'question' | 'bug' | 'request' | 'improve';

export interface FeedbackUserInfo {
  id?: number;
  login?: string;
  name?: string;
  surname?: string;
}

export interface Feedback {
  id: number;
  type?: FeedbackType | string;
  source?: string;
  title?: string;
  data?: string;
  files?: string[];
  user?: number;
  user_info?: FeedbackUserInfo;
  token?: string;
  network?: number;
  user_status?: number;
  created?: number;
  updated?: number;
}

export interface FeedbackSaveRequest {
  type: FeedbackType;
  data: string;
  files?: string[];
  source?: string;
}

export interface FeedbackSaveResponse {
  id: number;
  new: boolean;
}

export interface FeedbackGetRequest {
  id?: number | number[];
  limit?: number;
  offset?: number;
  search?: string;
  type?: string;
  source?: string;
}

export interface FeedbackGetResponse {
  feedback: Feedback[];
  count: number | null;
}

