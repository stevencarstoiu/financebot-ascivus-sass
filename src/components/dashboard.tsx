"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import type {
  Metrics,
  PriorityOffer,
  TimelineItem,
} from "@/features/dashboard/types";
import { money } from "@/lib/crm";
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("sales-mode", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("sales-mode", cb);
  };
}
function snapshot() {
  try {
    return localStorage.getItem("sales-view") === "advanced"
      ? "advanced"
      : "basic";
  } catch {
    return "basic";
  }
}
export function Dashboard({
  metrics,
  offers,
  activity,
  demo = false,
  threshold = 7,
  children,
}: {
  metrics: Metrics;
  offers: PriorityOffer[];
  activity: TimelineItem[];
  demo?: boolean;
  threshold?: number;
  children?: React.ReactNode;
}) {
  const mode = useSyncExternalStore(subscribe, snapshot, () => "basic");
  const setMode = (value: string) => {
    try {
      localStorage.setItem("sales-view", value);
    } catch {}
    window.dispatchEvent(new Event("sales-mode"));
  };
  const root = demo ? "/demo" : "/app";
  const closed = (metrics.counts.won || 0) + (metrics.counts.lost || 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A CLEARER PICTURE, A BETTER NEXT STEP</p>
          <h1>Your pipeline, in focus.</h1>
          <p className="muted">
            A little clarity for the conversations that matter.
          </p>
        </div>
        <div className="view-switch" role="group" aria-label="Dashboard view">
          <button
            aria-pressed={mode === "basic"}
            onClick={() => setMode("basic")}
          >
            Basic
          </button>
          <button
            aria-pressed={mode === "advanced"}
            onClick={() => setMode("advanced")}
          >
            Advanced
          </button>
        </div>
      </div>
      <div className="actions">
        <Link className="button" href={demo ? "/signup" : "/app/offers/new"}>
          {demo ? "Try with your company →" : "+ Add offer"}
        </Link>
        {!demo && (
          <Link className="button secondary" href="/app/imports">
            ⇧ Import offers
          </Link>
        )}
        <span className="subtle">
          {demo
            ? "Deterministic fictional snapshot · 12 November 2026"
            : "Current organization · amounts kept in original currency"}
        </span>
      </div>
      <div className="stat-grid">
        {[
          ["Active offers", metrics.total, "All non-archived offers"],
          [
            "Needs follow-up",
            metrics.followup,
            `Unanswered for ${threshold}+ calendar days`,
          ],
          [
            "Waiting for response",
            metrics.waiting,
            "Sent offers without a first response",
          ],
          [
            "Confirmed won",
            metrics.counts.won || 0,
            "Manually confirmed won offers",
          ],
        ].map(([label, value, note], i) => (
          <section
            key={label}
            className={"panel stat-card " + (i === 1 ? "highlight" : "")}
          >
            <div className="stat-label">
              {label}
              <span aria-hidden>→</span>
            </div>
            <div className="stat-value">{value}</div>
            <small>{note}</small>
          </section>
        ))}
      </div>
      {!metrics.total && (
        <section className="notice">
          <h2>Your workspace is ready for its first offer</h2>
          <p>
            Create a customer, add an offer, or import an existing spreadsheet.
            Your real metrics will appear here.
          </p>
          <Link href="/app/customers/new">Add your first customer →</Link>
        </section>
      )}
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Worth a conversation</h2>
            <small>
              Unanswered offers that meet your {threshold}-day follow-up rule.
              No messages are sent automatically.
            </small>
          </div>
          <Link href={root + "/offers" + (demo ? "" : "?followup=yes")}>
            View offers →
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Offer / customer</th>
                <th>Offer value</th>
                <th>Sent date</th>
                <th>Status</th>
                <th>Next step</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={root + "/offers/" + o.id}>{o.title}</Link>
                    <small>{o.customer}</small>
                  </td>
                  <td>{money(o.amount, o.currency)}</td>
                  <td>{o.sent_at.slice(0, 10)}</td>
                  <td>
                    <span className={"badge " + o.status}>{o.status}</span>
                  </td>
                  <td>
                    <Link href={root + "/offers/" + o.id}>Review offer →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!offers.length && (
          <div className="empty">
            No offers need attention under the selected filters.
          </div>
        )}
        <div className="table-foot">
          <span>Showing up to 10 priority offers</span>
          <span>Potential value ≠ recovered revenue</span>
        </div>
      </section>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="section-heading">
            <h2>Pipeline at a glance</h2>
            <span className="subtle">By status</span>
          </div>
          {["draft", "sent", "replied", "won", "lost"].map((status) => (
            <div className="bar-row" key={status}>
              <span>{status[0].toUpperCase() + status.slice(1)}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${metrics.total ? ((metrics.counts[status] || 0) / metrics.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <strong>{metrics.counts[status] || 0}</strong>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Recent activity</h2>
          <small>
            {demo
              ? "Fictional manual logs"
              : "Manual logs and system-recorded status changes"}
          </small>
          <ul className="timeline">
            {activity.slice(0, 4).map((a) => (
              <li key={a.id}>
                <strong>{a.type.replaceAll("_", " ")}</strong>
                {a.description}
                <small>
                  {a.occurred_at.slice(0, 16).replace("T", " ")} UTC
                </small>
              </li>
            ))}
          </ul>
          {!activity.length && (
            <p className="empty">Your next activity will appear here.</p>
          )}
        </section>
      </div>
      {mode === "advanced" && (
        <section aria-label="Advanced analytics">
          <h2 className="advanced-title">A closer look</h2>
          {children}
          <div className="detail-grid">
            <section className="panel">
              <h2>Value by original currency</h2>
              <p className="subtle">
                Open potential = sent + replied. Won = manually confirmed.
                Currencies are never combined.
              </p>
              <div className="money-list">
                {metrics.values.map((v) => (
                  <div key={v.currency}>
                    <small>Open potential</small>
                    <strong>{money(v.open, v.currency)}</strong>
                    <small>Confirmed won</small>
                    <strong>{money(v.won, v.currency)}</strong>
                  </div>
                ))}
              </div>
              {!metrics.values.length && (
                <p className="muted">No values yet.</p>
              )}
            </section>
            <section className="panel">
              <h2>Unanswered offer age</h2>
              {["0–6", "7–13", "14–29", "30+"].map((b) => (
                <div className="bar-row" key={b}>
                  <span>{b} days</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${metrics.waiting ? ((metrics.aging[b] || 0) / metrics.waiting) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <strong>{metrics.aging[b] || 0}</strong>
                </div>
              ))}
            </section>
            <section className="panel">
              <h2>Closed-offer conversion</h2>
              <div className="stat-value">
                {closed
                  ? Math.round(((metrics.counts.won || 0) / closed) * 100) + "%"
                  : "—"}
              </div>
              <p className="subtle">
                Won ÷ (won + lost). {closed} closed offers. This is not a
                forecast.
              </p>
              <p>
                {metrics.imported} imported · {metrics.total - metrics.imported}{" "}
                manually created
              </p>
            </section>
            <section className="panel">
              <h2>Offer creation by month and current status</h2>
              <p className="subtle">
                Creation cohorts, not historical status transitions.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Current status</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.trends.map((t) => (
                      <tr key={t.month + t.status}>
                        <td>{t.month}</td>
                        <td>{t.status}</td>
                        <td>{t.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          {!demo && (
            <p>
              <a className="button secondary" href="/api/export">
                Download up to 1,000 active offers (CSV)
              </a>
            </p>
          )}
        </section>
      )}
    </>
  );
}
