import { workspace } from "@/lib/workspace";
import { settings } from "./actions";
import { logout } from "@/app/auth/actions";
import { Submit } from "@/components/submit";
export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { store, org, role, memberships } = await workspace();
  const profile = await store.profile();
  const { message } = await searchParams;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE IT YOUR WORKSPACE</p>
          <h1>Settings</h1>
          <p className="muted">Organization, profile and preview access.</p>
        </div>
        <form action={logout}>
          <button className="secondary">Sign out</button>
        </form>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <div className="detail-grid">
        <section className="panel">
          <h2>Organization</h2>
          <p className="subtle">
            Your role: {role}. Only owner/admin can edit these settings.
          </p>
          <form action={settings}>
            <input type="hidden" name="kind" value="organization" />
            <input type="hidden" name="version" value={org.updated_at} />
            <fieldset
              disabled={!["owner", "admin"].includes(role)}
              style={{ border: 0, padding: 0 }}
            >
              <label>
                Name
                <input
                  name="name"
                  defaultValue={org.name}
                  required
                  maxLength={120}
                />
              </label>
              <label>
                Default ISO currency
                <input
                  name="default_currency"
                  defaultValue={org.default_currency}
                  required
                  pattern="[A-Z]{3}"
                  maxLength={3}
                />
              </label>
              <label>
                Follow-up after (calendar days)
                <input
                  name="followup_after_days"
                  type="number"
                  min={1}
                  max={365}
                  defaultValue={org.followup_after_days}
                  required
                />
              </label>
              <Submit>Save organization</Submit>
            </fieldset>
          </form>
        </section>
        <section className="panel">
          <h2>Your profile</h2>
          <form action={settings}>
            <input type="hidden" name="kind" value="profile" />
            <label>
              Display name
              <input
                name="display_name"
                defaultValue={profile?.display_name || ""}
                maxLength={120}
              />
            </label>
            <Submit>Save profile</Submit>
          </form>
          <h2 style={{ marginTop: 30 }}>Current organization</h2>
          <form action={settings}>
            <input type="hidden" name="kind" value="switch" />
            <label>
              Workspace
              <select name="organization_id" defaultValue={org.id}>
                {memberships.map((m) => (
                  <option value={m.organization_id} key={m.organization_id}>
                    {(m.organizations as unknown as { name: string })?.name ||
                      m.organization_id}
                  </option>
                ))}
              </select>
            </label>
            <Submit>Switch organization</Submit>
          </form>
        </section>
        <section className="panel">
          <h2>Billing preview</h2>
          <span className="badge">Provisional preview plan</span>
          <p style={{ marginTop: 18 }}>Payments not yet enabled.</p>
          <p className="muted">
            CRM, imports and both dashboard views are available for Phase 1
            evaluation. Preview limits: 10,000 offers, 10,000 customers, 20,000
            contacts, 1,000 rows per import.
          </p>
          <p className="subtle">
            No card collection, checkout, Stripe network calls or automatic
            charges.
          </p>
        </section>
        <section className="panel">
          <h2>Interface & communication</h2>
          <p className="muted">
            Basic and Advanced are view preferences, not paid tiers. Switch on
            the overview; the preference is saved in this browser.
          </p>
          <p className="subtle">
            Calls and emails are manual logs. This workspace does not contact
            customers. Invitations and team management are not enabled.
          </p>
        </section>
      </div>
    </>
  );
}
