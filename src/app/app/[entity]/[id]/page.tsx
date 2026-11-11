import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { workspace } from "@/lib/workspace";
import { isEntity, title, type Row } from "@/lib/crm";
import { RecordForm } from "@/components/record-form";
import { archiveRecord, logActivity } from "../../crm-actions";
import { Submit } from "@/components/submit";
export default async function Detail({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string; id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { entity, id } = await params;
  if (!isEntity(entity) || !z.uuid().safeParse(id).success) notFound();
  const { client, org } = await workspace();
  const query =
    entity === "offers"
      ? client.from("offer_records").select("*")
      : entity === "customers"
        ? client.from("customers").select("*")
        : client.from("contacts").select("*");
  const { data, error } = await query
    .eq("organization_id", org.id)
    .eq("id", id)
    .single();
  if (error || !data) notFound();
  const row = data as unknown as Row;
  const [{ data: customers }, { data: contacts }, s] = await Promise.all([
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
      .eq("customer_id", entity === "customers" ? id : row.customer_id!)
      .order("full_name")
      .limit(1000),
    searchParams,
  ]);
  const relatedOffers =
    entity === "customers"
      ? (
          await client
            .from("offers")
            .select("id,title,status")
            .eq("organization_id", org.id)
            .eq("customer_id", id)
            .order("updated_at", { ascending: false })
            .limit(25)
        ).data || []
      : [];
  const timeline =
    entity === "offers"
      ? (
          await client
            .from("activities")
            .select("*")
            .eq("organization_id", org.id)
            .eq("offer_id", id)
            .order("occurred_at", { ascending: false })
            .limit(50)
        ).data || []
      : [];
  return (
    <>
      <Link href={"/app/" + entity}>← All {entity}</Link>
      <div className="page-heading">
        <div>
          <h1>{title(entity, row)}</h1>
          <p className="muted">
            {row.archived_at
              ? "Archived · restore below to return to active lists"
              : "Active record"}{" "}
            · Updated {row.updated_at?.slice(0, 16).replace("T", " ")}
          </p>
        </div>
      </div>
      {s.message && (
        <p className="notice" role="status">
          {s.message}
        </p>
      )}
      <section className="panel">
        <RecordForm
          entity={entity}
          row={row}
          customers={customers as Row[]}
          contacts={contacts as Row[]}
          currency={org.default_currency}
        />
      </section>
      {entity === "customers" && (
        <div className="detail-grid" style={{ marginTop: 20 }}>
          <section className="panel">
            <h2>Contacts</h2>
            {contacts
              ?.filter((c) => c.customer_id === id)
              .map((c) => (
                <p key={c.id}>
                  <Link href={"/app/contacts/" + c.id}>{c.full_name}</Link>
                </p>
              ))}
            <Link href="/app/contacts/new">+ Add contact</Link>
          </section>
          <section className="panel">
            <h2>Recent offers</h2>
            {relatedOffers.map((o) => (
              <p key={o.id}>
                <Link href={"/app/offers/" + o.id}>{o.title}</Link>{" "}
                <span className={"badge " + o.status}>{o.status}</span>
              </p>
            ))}
            <Link href="/app/offers/new">+ Add offer</Link>
          </section>
        </div>
      )}
      {entity === "offers" && (
        <div className="detail-grid" style={{ marginTop: 20 }}>
          <section className="panel">
            <h2>Log a manual activity</h2>
            <p className="subtle">
              Records an action outside this product. This does not send an
              email or make a call.
            </p>
            <form action={logActivity}>
              <input type="hidden" name="offer_id" value={id} />
              <label>
                Activity type
                <select name="type">
                  <option value="note">Note</option>
                  <option value="call_logged">Call logged manually</option>
                  <option value="email_logged">Email logged manually</option>
                  <option value="followup_logged">
                    Follow-up logged manually
                  </option>
                </select>
              </label>
              <label>
                Description
                <textarea name="description" required maxLength={2000} />
              </label>
              <Submit>Record activity</Submit>
            </form>
          </section>
          <section className="panel">
            <h2>Offer timeline</h2>
            <ul className="timeline">
              {timeline.map((a) => (
                <li key={a.id}>
                  <strong>
                    {a.type.replaceAll("_", " ")} ·{" "}
                    {a.type === "status_change"
                      ? "system recorded"
                      : "manual log"}
                  </strong>
                  {a.description}
                  <small>
                    {a.occurred_at.slice(0, 16).replace("T", " ")} UTC
                  </small>
                </li>
              ))}
            </ul>
            {!timeline.length && (
              <p className="muted">No activities logged yet.</p>
            )}
          </section>
        </div>
      )}
      <section className="panel danger-zone">
        <h2>
          {row.archived_at ? "Restore this record" : "Archive this record"}
        </h2>
        <p className="subtle">
          History is retained. Related records keep their links.
        </p>
        <form action={archiveRecord}>
          <input type="hidden" name="entity" value={entity} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="version" value={row.updated_at!} />
          <input
            type="hidden"
            name="restore"
            value={row.archived_at ? "yes" : "no"}
          />
          <label className="check">
            <input type="checkbox" name="confirm" value="yes" required />I
            confirm this change
          </label>
          <Submit>
            {row.archived_at ? "Restore record" : "Archive record"}
          </Submit>
        </form>
      </section>
    </>
  );
}
