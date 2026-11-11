import Link from "next/link";
export default function Page() {
  return (
    <main id="main" className="document panel">
      <Link href="/">← Sales workspace</Link>
      <h1>Terms of use — draft</h1>
      <p>
        Preview software for evaluation only. Offer statuses and communication
        logs are manually entered; they are not proof of communication or
        revenue recovery. Commercial terms, operator identity and governing
        jurisdiction require legal review before release.
      </p>
      <Link className="button" href="/demo">
        Explore fictional demo
      </Link>
    </main>
  );
}
