import Link from "next/link";
export function Shell({
  children,
  demo = false,
  name = "Sales workspace",
}: {
  children: React.ReactNode;
  demo?: boolean;
  name?: string;
}) {
  const root = demo ? "/demo" : "/app";
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link className="wordmark" href="/">
          ASCIVUS<small>SALES WORKSPACE · PREVIEW</small>
        </Link>
        <div className="org-card">
          <span className="avatar">{demo ? "F" : "W"}</span>
          <div>
            <strong>{name}</strong>
            <small>
              {demo ? "Fictional organization" : "Your organization"}
            </small>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Workspace">
          {[
            ["", "◫", "Overview"],
            ["offers", "→", "Offers"],
            ["customers", "▦", "Customers"],
            ["contacts", "◎", "Contacts"],
            ["imports", "⇧", "Imports"],
            ["activity", "◷", "Activity"],
            ["settings", "⚙", "Settings"],
          ]
            .filter(([p]) => !demo || ["", "offers"].includes(p))
            .map(([path, icon, label]) => (
              <Link key={path} href={root + (path ? "/" + path : "")}>
                <span aria-hidden>{icon}</span>
                {label}
              </Link>
            ))}
        </nav>
        <div className="sidebar-note">
          <span className="dot" />
          <strong>
            {demo
              ? "DEMO — fictional data"
              : "A focused place to follow through"}
          </strong>
          <p>
            {demo
              ? "Read-only. No account, emails or payments."
              : "No automated outreach. You stay in control."}
          </p>
          {demo && <Link href="/signup">Try with your company →</Link>}
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <span>{demo ? "Product preview" : "Your sales workspace"}</span>
          <div>
            <span className="badge">Phase 1</span>
            <Link href={demo ? "/signup" : "/app/settings"}>
              {demo ? "Create account →" : "Workspace settings"}
            </Link>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            DEMO — fictional data · Read-only, separate from real organizations
          </div>
        )}
        <main id="main" className="content">
          {children}
        </main>
      </div>
    </div>
  );
}
