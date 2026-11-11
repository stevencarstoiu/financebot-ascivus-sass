import Link from "next/link";
export default function Page() {
  return (
    <main id="main" className="document panel">
      <Link href="/">← Sales workspace</Link>
      <h1>A calmer sales workflow</h1>
      <p>
        Manage customers, contacts, offers and manual follow-up logs. Import
        CSV/XLSX files, review the pipeline by currency, and inspect audit
        history. No email is sent automatically.
      </p>
      <Link className="button" href="/demo">
        Explore fictional demo
      </Link>
    </main>
  );
}
