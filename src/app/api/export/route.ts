import { apiWorkspace } from "@/lib/workspace";
import { safeCsv } from "@/lib/validation";
import { AccessError } from "@/lib/db";
export async function GET() {
  try {
    const { store } = await apiWorkspace();
    const data = await store.export();
    const columns = [
      "title",
      "exact_amount",
      "currency",
      "status",
      "sent_at",
      "external_reference",
    ];
    const csv = [
      columns.map(safeCsv).join(","),
      ...data.map((row) => columns.map((c) => safeCsv(row[c])).join(",")),
    ].join("\r\n");
    return new Response("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="offers.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return Response.json(
      { error: "Export unavailable" },
      { status: e instanceof AccessError ? e.status : 503 },
    );
  }
}
