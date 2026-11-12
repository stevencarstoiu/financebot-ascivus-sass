import { NextRequest } from "next/server";
import { apiWorkspace } from "@/lib/workspace";
import { jsonApi } from "@/lib/api";
import { z } from "zod";
export async function GET(request: NextRequest) {
  return jsonApi(async () => {
    const { store } = await apiWorkspace();
    const p = request.nextUrl.searchParams;
    const clean = (s: string | null) =>
      (s || "").replace(/[%_\\]/g, "").slice(0, 120);
    const customer = z.uuid().safeParse(p.get("customer"));
    const contact = z.uuid().safeParse(p.get("contact"));
    return store.options(
      clean(p.get("q")),
      clean(p.get("cq")),
      customer.success ? customer.data : null,
      contact.success ? contact.data : null,
    );
  });
}
