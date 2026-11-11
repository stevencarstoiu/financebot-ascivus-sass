import { z } from "zod";
export const statuses = ["draft", "sent", "replied", "won", "lost"] as const;
export const currencies = new Set(Intl.supportedValuesOf("currency"));
export const currency = z
  .string()
  .refine((v) => currencies.has(v), "Choose a valid ISO currency");
export const amount = z
  .string()
  .regex(
    /^\d{1,14}(\.\d{1,4})?$/,
    "Use a positive decimal, up to four decimal places",
  );
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => v || null);
export const customerSchema = z.object({
  display_name: z.string().trim().min(1).max(200),
  customer_type: z.enum(["company", "person"]),
  external_reference: optional(120),
  website: z
    .union([z.literal(""), z.url().refine((s) => /^https?:\/\//.test(s))])
    .nullable()
    .transform((v) => v || null),
  notes: optional(4000),
});
export const contactSchema = z.object({
  customer_id: z.uuid(),
  full_name: z.string().trim().min(1).max(200),
  email: z
    .union([z.literal(""), z.email()])
    .nullable()
    .transform((v) => v || null),
  phone: optional(60),
  position: optional(120),
});
export const offerSchema = z
  .object({
    customer_id: z.uuid(),
    primary_contact_id: z
      .union([z.literal(""), z.uuid()])
      .nullable()
      .transform((v) => v || null),
    title: z.string().trim().min(1).max(240),
    external_reference: optional(120),
    amount,
    currency,
    status: z.enum(statuses),
    sent_at: z.string().nullable(),
    notes: optional(4000),
  })
  .superRefine((v, ctx) => {
    if (
      v.status !== "draft" &&
      (!v.sent_at ||
        !/^\d{4}-\d{2}-\d{2}$/.test(v.sent_at) ||
        !Number.isFinite(Date.parse(v.sent_at)) ||
        new Date(v.sent_at).toISOString().slice(0, 10) !== v.sent_at)
    )
      ctx.addIssue({
        code: "custom",
        path: ["sent_at"],
        message: "Sent date is required for non-draft offers",
      });
  });
export function statusDates(
  status: string,
  sent: string | null,
  now = new Date().toISOString(),
) {
  const sent_at =
    status === "draft" ? null : sent ? new Date(sent).toISOString() : null;
  const event = sent_at && sent_at > now ? sent_at : now;
  return {
    sent_at,
    first_response_at: status === "replied" ? event : null,
    closed_at: ["won", "lost"].includes(status) ? event : null,
  };
}
export function safeNext(value: string | null) {
  return value === "/reset-password" ? value : "/app";
}
export function needsFollowup(
  offer: {
    status: string;
    sent_at: string | null;
    first_response_at?: string | null;
    archived_at?: string | null;
  },
  days = 7,
  now = new Date(),
) {
  return (
    offer.status === "sent" &&
    !offer.first_response_at &&
    !offer.archived_at &&
    !!offer.sent_at &&
    Math.floor(Date.parse(now.toISOString().slice(0, 10)) / 86400000) -
      Math.floor(Date.parse(offer.sent_at.slice(0, 10)) / 86400000) >=
      days
  );
}
export function safeCsv(value: unknown) {
  const s = String(value ?? "");
  return (
    '"' + (/^[\s]*[=+\-@]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'
  );
}
