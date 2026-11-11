import Link from "next/link";
export default function Page() {
  return (
    <main id="main" className="document panel">
      <Link href="/">← Sales workspace</Link>
      <h1>Privacy notice — draft</h1>
      <p>
        This is a preview draft, not a final legal notice. Tenant records are
        stored in the configured Supabase project. Imports are bounded, binary
        uploads are not retained, and staging expires after 24 hours with the
        documented maintenance command. Contact your workspace owner for access
        or retention requests. Operator identity, legal basis, retention periods
        and processor agreements must be completed before public release.
      </p>
      <Link className="button" href="/demo">
        Explore fictional demo
      </Link>
    </main>
  );
}
