import Link from "next/link";
import { workspace } from "@/lib/workspace";
import { Dashboard } from "@/components/dashboard";
import type { Metrics, PriorityOffer } from "@/features/dashboard/types";
import { statuses } from "@/lib/validation";
export default async function Overview({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { client, org } = await workspace();
  const s = await searchParams;
  const currency =
    s.currency && /^[A-Z]{3}$/.test(s.currency) ? s.currency : null;
  const customer =
    s.customer && /^[0-9a-f-]{36}$/i.test(s.customer) ? s.customer : null;
  const from = s.from && /^\d{4}-\d{2}-\d{2}$/.test(s.from) ? s.from : null;
  const to =
    s.to && /^\d{4}-\d{2}-\d{2}$/.test(s.to) ? s.to + "T23:59:59Z" : null;
  const status = statuses.includes(s.status as (typeof statuses)[number])
    ? s.status
    : null;
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - org.followup_after_days);
  let priority = client
    .from("offer_records")
    .select(
      "id,title,exact_amount,currency,status,sent_at,customers(display_name)",
    )
    .eq("organization_id", org.id)
    .eq("status", "sent")
    .is("first_response_at", null)
    .is("archived_at", null)
    .lte("sent_at", cutoff.toISOString().slice(0, 10) + "T23:59:59Z");
  if (currency) priority = priority.eq("currency", currency);
  if (customer) priority = priority.eq("customer_id", customer);
  if (from) priority = priority.gte("created_at", from);
  if (to) priority = priority.lte("created_at", to);
  if (status) priority = priority.eq("status", status);
  const [stats, offers, activities, customers] = await Promise.all([
    client.rpc("dashboard_metrics", {
      p_org: org.id,
      p_currency: currency,
      p_customer: customer,
      p_from: from,
      p_to: to,
      p_status: status,
    }),
    priority.order("sent_at").limit(10),
    client
      .from("activities")
      .select("id,description,type,occurred_at")
      .eq("organization_id", org.id)
      .order("occurred_at", { ascending: false })
      .limit(4),
    client
      .from("customers")
      .select("id,display_name")
      .eq("organization_id", org.id)
      .order("display_name")
      .limit(1000),
  ]);
  if (stats.error || offers.error || activities.error)
    throw new Error("Dashboard unavailable");
  const priorityOffers = (offers.data || []).map((o) => ({
    id: o.id,
    title: o.title,
    amount: o.exact_amount,
    currency: o.currency,
    status: o.status,
    sent_at: o.sent_at,
    customer:
      (o.customers as unknown as { display_name: string } | null)
        ?.display_name || "Customer",
  })) as PriorityOffer[];
  return (
    <Dashboard
      metrics={stats.data as Metrics}
      offers={priorityOffers}
      activity={activities.data || []}
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
            {customers.data?.map((c) => (
              <option key={c.id} value={c.id}>
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
