import { notFound } from "next/navigation";
import { workspace } from "@/lib/workspace";
import { isEntity, labels, type Row } from "@/lib/crm";
import { RecordForm } from "@/components/record-form";
export default async function New({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<{ message?: string; customer?: string }>;
}) {
  const { entity } = await params;
  if (!isEntity(entity)) notFound();
  const { client, org } = await workspace();
  const s = await searchParams;
  const [{ data: customers }, { data: contacts }] = await Promise.all([
    client
      .from("customers")
      .select("id,display_name,archived_at")
      .eq("organization_id", org.id)
      .order("display_name")
      .limit(1000),
    client
      .from("contacts")
      .select("id,full_name,customer_id")
      .eq("organization_id", org.id)
      .is("archived_at", null)
      .order("full_name")
      .limit(1000),
  ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE THE NEXT STEP CLEAR</p>
          <h1>Add {labels[entity].toLowerCase()}</h1>
        </div>
      </div>
      {s.message && (
        <p className="notice error" role="alert">
          {s.message}
        </p>
      )}
      <section className="panel">
        <RecordForm
          entity={entity}
          customers={customers as Row[]}
          contacts={contacts as Row[]}
          currency={org.default_currency}
        />
      </section>
    </>
  );
}
