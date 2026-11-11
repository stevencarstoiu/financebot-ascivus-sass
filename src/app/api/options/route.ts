import { NextRequest, NextResponse } from "next/server";
import { workspace } from "@/lib/workspace";
import { z } from "zod";
export async function GET(request: NextRequest) {
  const { client, org } = await workspace();
  const p = request.nextUrl.searchParams;
  const q = (p.get("q") || "").replace(/[%_\\]/g, "").slice(0, 120);
  const cq = (p.get("cq") || "").replace(/[%_\\]/g, "").slice(0, 120);
  const selected = z.uuid().safeParse(p.get("customer"));
  const contact = z.uuid().safeParse(p.get("contact"));
  const [customers, selectedCustomer, contacts, selectedContact] =
    await Promise.all([
      client
        .from("customers")
        .select("id,display_name")
        .eq("organization_id", org.id)
        .is("archived_at", null)
        .ilike("display_name", "%" + q + "%")
        .order("display_name")
        .limit(30),
      selected.success
        ? client
            .from("customers")
            .select("id,display_name")
            .eq("organization_id", org.id)
            .eq("id", selected.data)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      selected.success
        ? client
            .from("contacts")
            .select("id,full_name,customer_id")
            .eq("organization_id", org.id)
            .eq("customer_id", selected.data)
            .is("archived_at", null)
            .ilike("full_name", "%" + cq + "%")
            .order("full_name")
            .limit(30)
        : Promise.resolve({ data: [], error: null }),
      selected.success && contact.success
        ? client
            .from("contacts")
            .select("id,full_name,customer_id")
            .eq("organization_id", org.id)
            .eq("customer_id", selected.data)
            .eq("id", contact.data)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
  if (customers.error || contacts.error)
    return NextResponse.json({ error: "Options unavailable" }, { status: 503 });
  return NextResponse.json(
    {
      customers: customers.data,
      selectedCustomer: selectedCustomer.data,
      contacts: contacts.data,
      selectedContact: selectedContact.data,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
