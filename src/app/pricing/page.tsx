import Link from "next/link";
export default function Page() {
  return (
    <main id="main" className="document panel">
      <Link href="/">← Sales workspace</Link>
      <h1>Built for a careful preview</h1>
      <p>
        The provisional preview plan supports Phase 1 testing. Payments are not
        yet enabled. No card details or trial billing are collected.
      </p>
      <Link className="button" href="/demo">
        Explore fictional demo
      </Link>
    </main>
  );
}
