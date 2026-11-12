import { NextRequest } from "next/server";
import { apiWorkspace } from "@/lib/workspace";
import { jsonApi, requireOrigin, readJson } from "@/lib/api";
import { AccessError } from "@/lib/db";
import { isEntity } from "@/lib/crm";
import { z } from "zod";
type Context = { params: Promise<{ entity: string; record?: string[] }> };
export async function GET(request: NextRequest, context: Context) {
  return jsonApi(async () => {
    const { entity, record } = await context.params;
    if (!isEntity(entity)) throw new AccessError(404, "Resource unavailable");
    const { store } = await apiWorkspace();
    if (record?.length) {
      const id = z.uuid().parse(record[0]);
      if (record.length !== 1)
        throw new AccessError(404, "Resource unavailable");
      const row = await store.record(entity, id);
      if (!row) throw new AccessError(404, "Record unavailable");
      return row;
    }
    return store.records(
      entity,
      Object.fromEntries(request.nextUrl.searchParams),
    );
  });
}
export async function POST(request: NextRequest, context: Context) {
  return jsonApi(async () => {
    requireOrigin(request);
    if (Number(request.headers.get("content-length")) > 20000)
      throw new AccessError(413, "Request too large");
    const { entity, record } = await context.params;
    if (!isEntity(entity)) throw new AccessError(404, "Resource unavailable");
    const { store } = await apiWorkspace();
    const body = z
      .record(z.string(), z.unknown())
      .parse(await readJson(request));
    if (record?.length) {
      const id = z.uuid().parse(record[0]);
      if (record.length === 2 && record[1] === "archive") {
        await store.archive(
          entity,
          id,
          z.string().parse(body.version),
          body.restore === true,
        );
        return { id };
      }
      if (record.length !== 1)
        throw new AccessError(404, "Resource unavailable");
      return {
        id: await store.save(entity, body, id, z.string().parse(body.version)),
      };
    }
    return { id: await store.save(entity, body) };
  });
}
