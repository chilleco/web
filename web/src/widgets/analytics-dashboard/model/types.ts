export interface AdminStats {
  users: number;
  posts: number;
  products: number;
  payments?: number;
  visits?: number;
  tasks?: number;
}

export type FunnelStageKey =
  | 'visit'
  | 'registration'
  | 'dataSubmission'
  | 'engagement'
  | 'taskCompletion'
  | 'referralInvite'
  | 'returningVisit'
  | 'purchase'
  | 'repeatPurchase';

export interface FunnelStage {
  key: FunnelStageKey;
  count: number;
  relativeFirst: number;
  relativePrev: number;
}
