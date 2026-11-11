import Link from "next/link";
import { demoOffers } from "@/features/demo/data";
import { money } from "@/lib/crm";
export default async function Offers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const s = await searchParams;
  const offers = demoOffers.filter(
    (o) =>
      (!s.q ||
        (o.title + " " + o.customer)
          .toLowerCase()
          .includes(s.q.toLowerCase())) &&
      (!s.status || o.status === s.status),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FICTIONAL DATA · READ-ONLY</p>
          <h1>Offers</h1>
          <p className="muted">
            Explore a sample pipeline without creating an account.
          </p>
        </div>
        <Link className="button" href="/signup">
          Try with your company →
        </Link>
      </div>
      <form className="filters">
        <label>
          Search offers
          <input
            name="q"
            defaultValue={s.q}
            placeholder="Customer or offer title"
          />
        </label>
        <label>
          Status
          <select name="status" defaultValue={s.status}>
            <option value="">All statuses</option>
            {["draft", "sent", "replied", "won", "lost"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <button>Filter offers</button>
        <Link href="/demo/offers">Clear</Link>
      </form>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Offer / customer</th>
                <th>Value</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={"/demo/offers/" + o.id}>{o.title}</Link>
                    <small>{o.customer}</small>
                  </td>
                  <td>{money(o.amount, o.currency)}</td>
                  <td>
                    <span className={"badge " + o.status}>{o.status}</span>
                  </td>
                  <td>
                    <Link href={"/demo/offers/" + o.id}>Review →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!offers.length && (
          <p className="empty">No fictional offers match those filters.</p>
        )}
      </section>
    </>
  );
}
