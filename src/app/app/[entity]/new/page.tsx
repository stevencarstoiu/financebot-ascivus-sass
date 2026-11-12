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
  const { store, org } = await workspace();
  const s = await searchParams;
  const [customers, contacts] = await Promise.all([
    store.customers(),
    store.contacts(),
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
