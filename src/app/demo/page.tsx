import Link from "next/link";
import { Dashboard } from "@/components/dashboard";
import {
  demoOffers,
  demoMetrics,
  demoActivity,
  demoNow,
} from "@/features/demo/data";
import { needsFollowup } from "@/lib/validation";
export default async function Demo({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string; status?: string }>;
}) {
  const s = await searchParams;
  const filtered = demoOffers.filter(
    (o) =>
      (!s.currency || o.currency === s.currency) &&
      (!s.status || o.status === s.status),
  );
  return (
    <Dashboard
      demo
      metrics={demoMetrics(filtered)}
      offers={filtered.filter((o) => needsFollowup(o, 7, demoNow))}
      activity={demoActivity}
    >
      <form className="filters">
        <label>
          Currency
          <select name="currency" defaultValue={s.currency}>
            <option value="">All</option>
            <option>EUR</option>
            <option>RON</option>
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={s.status}>
            <option value="">All</option>
            {["draft", "sent", "replied", "won", "lost"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <button>Apply demo filters</button>
        <Link href="/demo">Clear</Link>
      </form>
    </Dashboard>
  );
}
