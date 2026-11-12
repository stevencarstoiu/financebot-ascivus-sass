import Link from "next/link";
import { workspace } from "@/lib/workspace";
const names: Record<string, string> = {
  customers: "Customer",
  contacts: "Contact",
  offers: "Offer",
  organizations: "Organization",
  organization_members: "Membership",
  activities: "Activity",
  import_jobs: "Import",
};
export default async function Activity({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const { store, user } = await workspace();
  const s = await searchParams;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(s.page)) || 1));
  const audit = s.tab === "audit";
  const { data, count } = await store.history(audit, page);
  const rows = (data || []).map((a) => ({
    ...a,
    heading:
      "entity_type" in a
        ? `${names[a.entity_type || ""] || "Record"} · ${a.action === "insert" ? "Created" : "Updated"}`
        : (a.type || "Activity").replaceAll("_", " "),
    description:
      "changed_fields" in a
        ? a.changed_fields?.length
          ? "Changed fields: " +
            a.changed_fields
              .map((f: string) => f.replaceAll("_", " "))
              .join(", ")
          : "Record created or operation recorded"
        : a.description,
    offerId: "offer_id" in a ? a.offer_id : null,
    manual: "type" in a && a.type !== "status_change",
  }));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CONTEXT YOU CAN COME BACK TO</p>
          <h1>Activity & history</h1>
          <p className="muted">
            Commercial logs and an append-only audit trail.
          </p>
        </div>
      </div>
      <div className="actions">
        <Link
          className={"button " + (!audit ? "" : "secondary")}
          href="/app/activity"
        >
          Commercial activity
        </Link>
        <Link
          className={"button " + (audit ? "" : "secondary")}
          href="/app/activity?tab=audit"
        >
          Audit history
        </Link>
      </div>
      <section className="panel" style={{ marginTop: 20 }}>
        <ul className="timeline">
          {rows.map((a) => (
            <li key={a.id}>
              <strong>{a.heading}</strong>
              {a.description}
              <small>
                {a.occurred_at.slice(0, 19).replace("T", " ")} UTC ·{" "}
                {a.actor_user_id === user.id
                  ? "You"
                  : a.actor_user_id
                    ? "Organization member"
                    : "System"}
                {a.manual ? " · Manual log" : ""}
              </small>
              {a.offerId && (
                <Link href={"/app/offers/" + a.offerId}>View offer →</Link>
              )}
            </li>
          ))}
        </ul>
        {!rows.length && <p className="empty">No history yet.</p>}
        <div className="table-foot">
          <span>
            {count || 0} entries · Page {page}
          </span>
          <div className="actions">
            {page > 1 && (
              <Link
                href={`?tab=${audit ? "audit" : "activity"}&page=${page - 1}`}
              >
                Previous
              </Link>
            )}
            {page * 30 < (count || 0) && (
              <Link
                href={`?tab=${audit ? "audit" : "activity"}&page=${page + 1}`}
              >
                Next
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
