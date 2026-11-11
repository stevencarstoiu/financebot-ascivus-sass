import { identity } from "@/lib/workspace";
import { createOrganization } from "./submit";
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  await identity();
  const { message } = await searchParams;
  return (
    <main className="auth-wrap">
      <section className="panel auth-card">
        <p className="eyebrow">A PLACE FOR YOUR PIPELINE</p>
        <h1>Create your organization</h1>
        <p>You become its owner. Invitations and team management come later.</p>
        {message && <p role="alert">{message}</p>}
        <form action={createOrganization}>
          <input type="hidden" name="request" value={crypto.randomUUID()} />
          <label>
            Organization name
            <input required name="name" minLength={2} maxLength={120} />
          </label>
          <label>
            Default currency
            <select name="currency">
              {["EUR", "RON", "USD", "GBP", "CHF"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button className="button">Create organization</button>
        </form>
      </section>
    </main>
  );
}
