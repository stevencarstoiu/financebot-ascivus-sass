import { workspace } from "@/lib/workspace";
import { safeCsv } from "@/lib/validation";
export async function GET() {
  const { client, org } = await workspace();
  const { data, error } = await client
    .from("offer_records")
    .select("title,exact_amount,currency,status,sent_at,external_reference")
    .eq("organization_id", org.id)
    .is("archived_at", null)
    .order("id")
    .limit(1000);
  if (error) return new Response("Export unavailable", { status: 503 });
  const columns = [
    "title",
    "exact_amount",
    "currency",
    "status",
    "sent_at",
    "external_reference",
  ] as const;
  const csv = [
    columns.map(safeCsv).join(","),
    ...(data || []).map((row) => columns.map((c) => safeCsv(row[c])).join(",")),
  ].join("\r\n");
  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="offers.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
