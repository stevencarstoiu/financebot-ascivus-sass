/** Liveness only: intentionally does not wake Neon or claim backend readiness. */
export async function GET(){return Response.json({status:'ok'},{headers:{'Cache-Control':'no-store'}});}
