import Link from "next/link";
import { notFound } from "next/navigation";
import { workspace } from "@/lib/workspace";
import { isEntity, title, money, labels } from "@/lib/crm";
import { needsFollowup, statuses } from "@/lib/validation";
export default async function Records({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { entity } = await params;
  if (!isEntity(entity)) notFound();
  const { store, org } = await workspace();
  const s = await searchParams;
  const { rows, count, page } = await store.records(entity, s);
  const customerList = entity === "offers" ? await store.customers() : [];
  const href = (p: number) => {
    const next = new URLSearchParams(
      Object.entries(s).filter(
        (x): x is [string, string] => typeof x[1] === "string",
      ),
    );
    next.set("page", String(p));
    return "?" + next.toString();
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR COMMERCIAL WORKSPACE</p>
          <h1>{entity[0].toUpperCase() + entity.slice(1)}</h1>
          <p className="muted">{count || 0} records · 25 per page</p>
        </div>
        <Link className="button" href={"/app/" + entity + "/new"}>
          + Add {labels[entity].toLowerCase()}
        </Link>
      </div>
      <form className="filters">
        <label>
          Search
          <input name="q" defaultValue={s.q} placeholder={"Search " + entity} />
        </label>
        <label>
          Sort
          <select name="sort" defaultValue={s.sort}>
            <option value="updated">Recently updated</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
        <label>
          Archive
          <select name="archived" defaultValue={s.archived}>
            <option value="no">Active</option>
            <option value="yes">Archived</option>
          </select>
        </label>
        {entity === "offers" && (
          <>
            <label>
              Status
              <select name="status" defaultValue={s.status}>
                <option value="">All statuses</option>
                {statuses.map((st) => (
                  <option key={st}>{st}</option>
                ))}
              </select>
            </label>
            <label>
              Currency
              <input
                name="currency"
                defaultValue={s.currency}
                maxLength={3}
                placeholder="All"
              />
            </label>
            <label>
              Customer
              <select name="customer" defaultValue={s.customer}>
                <option value="">All customers</option>
                {customerList.map((c) => (
                  <option key={c.id} value={c.id!}>
                    {c.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sent from
              <input type="date" name="from" defaultValue={s.from} />
            </label>
            <label>
              Sent through
              <input type="date" name="to" defaultValue={s.to} />
            </label>
            <label>
              Attention
              <select name="followup" defaultValue={s.followup}>
                <option value="">All offers</option>
                <option value="yes">Needs follow-up</option>
              </select>
            </label>
          </>
        )}
        <button>Apply filters</button>
        <Link href={"/app/" + entity}>Clear</Link>
      </form>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{labels[entity]}</th>
                <th>
                  {entity === "offers"
                    ? "Value"
                    : entity === "contacts"
                      ? "Email"
                      : "Type"}
                </th>
                <th>{entity === "offers" ? "Status" : "Updated"}</th>
                <th>Open record</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={"/app/" + entity + "/" + r.id}>
                      {title(entity, r)}
                    </Link>
                    {entity === "offers" &&
                      needsFollowup(
                        {
                          status: r.status!,
                          sent_at: r.sent_at,
                          first_response_at: r.first_response_at,
                        },
                        org.followup_after_days,
                      ) && <small>Needs follow-up</small>}
                  </td>
                  <td>
                    {entity === "offers"
                      ? money(r.exact_amount || "0", r.currency!)
                      : entity === "contacts"
                        ? r.email || "—"
                        : r.customer_type}
                  </td>
                  <td>
                    {entity === "offers" ? (
                      <span className={"badge " + r.status}>{r.status}</span>
                    ) : (
                      r.updated_at?.slice(0, 10)
                    )}
                  </td>
                  <td>
                    <Link href={"/app/" + entity + "/" + r.id}>
                      View & edit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className="empty">
            <h2>No {entity} to show yet</h2>
            <p>Add a record or change your filters.</p>
            <Link href={"/app/" + entity + "/new"}>
              Create your first {labels[entity].toLowerCase()}
            </Link>
          </div>
        )}
        <div className="table-foot">
          <span>Page {page}</span>
          <div className="actions">
            {page > 1 && <Link href={href(page - 1)}>← Previous</Link>}
            {page * 25 < (count || 0) && (
              <Link href={href(page + 1)}>Next →</Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
