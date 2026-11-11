"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel">
      <h1>Workspace temporarily unavailable</h1>
      <p>Check your connection and database setup, then try again.</p>
      <button onClick={reset}>Try again</button>
    </section>
  );
}
