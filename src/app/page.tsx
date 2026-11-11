import Link from "next/link";
export default function Home() {
  return (
    <main id="main" className="landing">
      <header className="public-nav">
        <Link href="/" className="wordmark">
          ASCIVUS <small>Sales workspace · working title</small>
        </Link>
        <nav>
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </header>
      <section className="hero">
        <div>
          <p className="eyebrow">LESS GUESSWORK. BETTER FOLLOW-THROUGH.</p>
          <h1>
            Good offers deserve
            <br />
            <em>a next conversation.</em>
          </h1>
          <p className="lede">
            Know which offers are waiting, keep your customer context close, and
            give every opportunity the attention it deserves.
          </p>
          <div className="actions">
            <Link className="button" href="/signup">
              Create your workspace →
            </Link>
            <Link className="button secondary" href="/demo">
              Explore the demo
            </Link>
          </div>
          <p className="muted">
            Focused CRM · Clear follow-ups · Your data stays yours
          </p>
        </div>
        <aside className="hero-card">
          <div className="hero-card-top">
            <span className="dot" />
            YOUR PIPELINE, IN FOCUS <span>Fictional example</span>
          </div>
          <p className="eyebrow">READY FOR A FOLLOW-UP</p>
          <h2>
            Turn waiting into
            <br />a clear next step.
          </h2>
          <div className="sample-row">
            <span className="avatar">OS</span>
            <div>
              <strong>Oak & Stone Studio</strong>
              <small>Workspace design proposal</small>
            </div>
            <span className="badge sent">Sent</span>
          </div>
          <div className="sample-row">
            <span className="avatar">NT</span>
            <div>
              <strong>North Trail Supply</strong>
              <small>Quarterly service package</small>
            </div>
            <span className="badge replied">Replied</span>
          </div>
          <div className="hero-note">
            A reminder to follow up. Always your decision.
          </div>
        </aside>
      </section>
      <section className="feature-grid">
        {[
          [
            "01",
            "One customer story",
            "Customers, contacts and offers, connected in one workspace.",
          ],
          [
            "02",
            "Nothing quietly forgotten",
            "A transparent calendar-day rule highlights unanswered offers.",
          ],
          [
            "03",
            "Clarity without the clutter",
            "Switch between a focused view and deeper pipeline insights.",
          ],
        ].map(([n, t, d]) => (
          <article className="panel" key={n}>
            <span className="eyebrow">{n}</span>
            <h2>{t}</h2>
            <p className="muted">{d}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
