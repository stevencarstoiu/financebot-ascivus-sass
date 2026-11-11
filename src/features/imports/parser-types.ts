export const fields = [
  "customer_name",
  "contact_name",
  "contact_email",
  "offer_title",
  "offer_value",
  "currency",
  "offer_status",
  "sent_at",
  "external_reference",
  "notes",
] as const;
export type Field = (typeof fields)[number];
export type Mapping = Partial<Record<Field, number>>;
export type Validated = {
  rows: { row: number; issues: string[]; duplicate: boolean }[];
  valid: boolean;
  duplicateCount: number;
};
