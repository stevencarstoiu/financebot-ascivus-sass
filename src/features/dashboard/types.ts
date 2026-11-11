export type Metrics = {
  total: number;
  counts: Record<string, number>;
  followup: number;
  waiting: number;
  values: { currency: string; open: string; won: string }[];
  aging: Record<string, number>;
  trends: { month: string; status: string; count: number }[];
  imported: number;
};
export type PriorityOffer = {
  id: string;
  title: string;
  customer: string;
  amount: string;
  currency: string;
  status: string;
  sent_at: string;
};
export type TimelineItem = {
  id: string;
  description: string;
  type: string;
  occurred_at: string;
};
