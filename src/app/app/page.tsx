import Link from "next/link";
import { workspace } from "@/lib/workspace";
import { Dashboard } from "@/components/dashboard";
import { statuses } from "@/lib/validation";
export default async function Overview({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { store, org } = await workspace();
  const s = await searchParams;
  const [{ metrics, offers: priorityOffers }, activities, customers] =
    await Promise.all([
      store.dashboard(s),
      store.activity(),
      store.customers(),
    ]);
  return (
    <Dashboard
      metrics={metrics}
      offers={priorityOffers}
      activity={activities}
      threshold={org.followup_after_days}
    >
      <form className="filters">
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
            <option value="">All</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id!}>
                {c.display_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={s.status}>
            <option value="">All</option>
            {statuses.map((st) => (
              <option key={st}>{st}</option>
            ))}
          </select>
        </label>
        <label>
          Created from
          <input type="date" name="from" defaultValue={s.from} />
        </label>
        <label>
          Created through
          <input type="date" name="to" defaultValue={s.to} />
        </label>
        <button>Apply analytics filters</button>
        <Link href="/app">Clear</Link>
      </form>
    </Dashboard>
  );
}
