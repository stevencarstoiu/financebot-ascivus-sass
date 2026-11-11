import Link from "next/link";
import { notFound } from "next/navigation";
import { demoOffers } from "@/features/demo/data";
import { money } from "@/lib/crm";
export default async function Offer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const o = demoOffers.find((o) => o.id === id);
  if (!o) notFound();
  return (
    <>
      <Link href="/demo/offers">← Fictional offers</Link>
      <div className="page-heading" style={{ marginTop: 24 }}>
        <div>
          <p className="eyebrow">DEMO — FICTIONAL DATA · READ-ONLY</p>
          <h1>{o.title}</h1>
          <p className="muted">{o.customer}</p>
        </div>
        <span className={"badge " + o.status}>{o.status}</span>
      </div>
      <section className="panel">
        <div className="record-summary">
          <div>
            <small>Original offer value</small>
            <h2>{money(o.amount, o.currency)}</h2>
          </div>
          <div>
            <small>Sent date</small>
            <h2>{o.sent_at || "Not sent"}</h2>
          </div>
          <div>
            <small>Fictional contact</small>
            <h2>{o.contact}</h2>
          </div>
        </div>
        <h2>Context & notes</h2>
        <p>{o.notes}</p>
        <p className="notice">
          This record is fictional. No messages were sent, no real revenue was
          generated, and this demo never reads or writes tenant data.
        </p>
        <Link className="button" href="/signup">
          Create your own workspace →
        </Link>
      </section>
    </>
  );
}
