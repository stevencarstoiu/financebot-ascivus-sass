export async function GET() {
  return new Response(null, {
    status: 303,
    headers: {
      Location:
        "/login?message=Use+the+one-time+email+code.+Link+invalid+or+expired",
      "Cache-Control": "private, no-store",
    },
  });
}
