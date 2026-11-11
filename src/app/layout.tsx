import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = {
  title: "ASCIVUS · Sales workspace",
  description:
    "A focused workspace for customers, offers and thoughtful follow-ups. Working title.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {children}
        <footer className="footer">
          Sales workspace · Phase 1 preview{" "}
          <Link href="/privacy">Privacy draft</Link>
          <Link href="/terms">Terms draft</Link>
        </footer>
      </body>
    </html>
  );
}
