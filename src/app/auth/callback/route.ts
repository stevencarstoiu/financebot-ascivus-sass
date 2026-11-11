import { NextRequest } from "next/server";
import { db, configured } from "@/lib/supabase";
import { safeNext } from "@/lib/validation";
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (configured() && code) {
    const client = await db();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return new Response(null, {
        status: 303,
        headers: {
          Location: safeNext(url.searchParams.get("next")),
          "Cache-Control": "private, no-store",
        },
      });
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/login?message=Confirmation+link+invalid+or+expired",
      "Cache-Control": "private, no-store",
    },
  });
}
