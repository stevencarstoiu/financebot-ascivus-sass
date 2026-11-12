import "server-only";
import { transaction, type Tx, AccessError } from "./db";
import type { Principal } from "./auth/server";
import { type Entity, type Row } from "./crm";
import {
  customerSchema,
  contactSchema,
  offerSchema,
  statusDates,
  statuses,
} from "./validation";
import type {
  Metrics,
  PriorityOffer,
  TimelineItem,
} from "@/features/dashboard/types";
import { z } from "zod";
export type Organization = {
  id: string;
  name: string;
  default_currency: string;
  followup_after_days: number;
  updated_at: string;
};
type HistoryRecord = {
  id: string;
  occurred_at: string;
  actor_user_id: string | null;
  entity_type?: string;
  action?: string;
  changed_fields?: string[];
  type?: string;
  description?: string;
  offer_id?: string;
};
export type Member = {
  organization_id: string;
  role: string;
  organizations: { id: string; name: string };
};
export function repo(who: Principal, orgId: string | null) {
  const run = <T>(f: (tx: Tx) => Promise<T>) => transaction(who, orgId, f);
  return {
    context: () =>
      run(async (tx) => {
        const ms = await tx.query<Member>(
          "select m.organization_id,m.role,jsonb_build_object('id',o.id,'name',o.name) organizations from sales.organization_members m join sales.organizations o on o.id=m.organization_id where m.user_id=$1 order by m.created_at,m.organization_id",
          [tx.user.id],
        );
        const org = orgId
          ? (
              await tx.query<Organization>(
                "select * from sales.organizations where id=$1",
                [orgId],
              )
            ).rows[0]
          : null;
        return {
          user: tx.user,
          memberships: ms.rows,
          org,
          role: ms.rows.find((m) => m.organization_id === orgId)?.role || "",
        };
      }),
    createOrganization: (name: string, currency: string, request: string) =>
      run(
        async (tx) =>
          (
            await tx.query<{ id: string }>(
              "select sales.create_organization($1,$2,$3) id",
              [name, currency, request],
            )
          ).rows[0].id,
      ),
    customers: () =>
      run(
        async (tx) =>
          (
            await tx.query<Row>(
              "select id,display_name,archived_at from sales.customers where organization_id=$1 order by display_name limit 1000",
              [orgId],
            )
          ).rows,
      ),
    contacts: (customer?: string) =>
      run(
        async (tx) =>
          (
            await tx.query<Row>(
              "select id,full_name,customer_id from sales.contacts where organization_id=$1 and ($2::uuid is null or customer_id=$2) order by full_name limit 1000",
              [orgId, customer || null],
            )
          ).rows,
      ),
    record: (entity: Entity, id: string) =>
      run(
        async (tx) =>
          (
            await tx.query<Row>(
              `select * from sales.${entity === "offers" ? "offer_records" : entity} where organization_id=$1 and id=$2`,
              [orgId, id],
            )
          ).rows[0] || null,
      ),
    records: (entity: Entity, s: Record<string, string | undefined>) =>
      run(async (tx) => {
        const page = Math.max(
          1,
          Math.min(10000, Math.floor(Number(s.page)) || 1),
        );
        const field =
          entity === "customers"
            ? "display_name"
            : entity === "contacts"
              ? "full_name"
              : "title";
        const values: unknown[] = [orgId];
        const filters = [
          "organization_id=$1",
          s.archived === "yes"
            ? "archived_at is not null"
            : "archived_at is null",
        ];
        const add = (sql: string, v: unknown) => {
          values.push(v);
          filters.push(sql.replace("?", `$${values.length}`));
        };
        if (s.q)
          add(
            `${field} ilike ?`,
            "%" + s.q.replace(/[%_\\]/g, "").slice(0, 120) + "%",
          );
        if (entity === "offers") {
          if (statuses.includes(s.status as (typeof statuses)[number]))
            add("status=?", s.status);
          if (s.currency && /^[A-Z]{3}$/.test(s.currency))
            add("currency=?", s.currency);
          if (s.customer && z.uuid().safeParse(s.customer).success)
            add("customer_id=?", s.customer);
          if (s.from && z.iso.date().safeParse(s.from).success)
            add("sent_at>=?::timestamptz", s.from);
          if (s.to && z.iso.date().safeParse(s.to).success)
            add("sent_at<=?::timestamptz", s.to + "T23:59:59Z");
          if (s.followup === "yes")
            filters.push(
              "status='sent' and first_response_at is null and (now() at time zone 'UTC')::date-(sent_at at time zone 'UTC')::date >= (select followup_after_days from sales.organizations where id=$1)",
            );
        }
        const table = entity === "offers" ? "offer_records" : entity;
        const where = filters.join(" and ");
        const count = Number(
          (
            await tx.query(
              `select count(*)::int count from sales.${table} where ${where}`,
              values,
            )
          ).rows[0].count,
        );
        const rows = await tx.query<Row>(
          `select * from sales.${table} where ${where} order by ${s.sort === "name" ? field + " asc" : "updated_at desc"},id limit 25 offset $${values.length + 1}`,
          [...values, (page - 1) * 25],
        );
        return { rows: rows.rows, count, page };
      }),
    save: (
      entity: Entity,
      input: Record<string, unknown>,
      id?: string,
      version?: string,
    ) =>
      run(async (tx) => {
        let payload: Record<string, unknown> =
          entity === "customers"
            ? customerSchema.parse(input)
            : entity === "contacts"
              ? contactSchema.parse(input)
              : offerSchema.parse(input);
        if (entity === "offers") {
          const v = offerSchema.parse(input);
          payload = { ...v, ...statusDates(v.status, v.sent_at) };
          if (id) {
            const old = (
              await tx.query<Row>(
                "select status,first_response_at,closed_at from sales.offers where organization_id=$1 and id=$2 for update",
                [orgId, id],
              )
            ).rows[0];
            if (!old) throw new AccessError(404, "Record unavailable");
            if (["won", "lost"].includes(v.status))
              payload.first_response_at = old.first_response_at;
            if (v.status === old.status) {
              payload.first_response_at = old.first_response_at;
              payload.closed_at = old.closed_at;
            }
          }
        }
        const keys = Object.keys(payload);
        const vals = Object.values(payload);
        if (id) {
          if (!version) throw new AccessError(409, "Reload before saving");
          const result = await tx.query<{ id: string }>(
            `update sales.${entity} set ${keys.map((k, i) => `"${k}"=$${i + 1}`).join(",")} where organization_id=$${vals.length + 1} and id=$${vals.length + 2} and updated_at=$${vals.length + 3} returning id`,
            [...vals, orgId, id, version],
          );
          if (!result.rowCount)
            throw new AccessError(409, "Record changed. Reload before saving");
          return result.rows[0].id;
        }
        return (
          await tx.query<{ id: string }>(
            `insert into sales.${entity}(organization_id,${keys.map((k) => `"${k}"`).join(",")}) values($1,${keys.map((_, i) => `$${i + 2}`).join(",")}) returning id`,
            [orgId, ...vals],
          )
        ).rows[0].id;
      }),
    archive: (entity: Entity, id: string, version: string, restore: boolean) =>
      run(async (tx) => {
        const r = await tx.query(
          `update sales.${entity} set archived_at=$1 where organization_id=$2 and id=$3 and updated_at=$4 returning id`,
          [restore ? null : new Date(), orgId, id, version],
        );
        if (!r.rowCount)
          throw new AccessError(409, "Record changed. Reload before retrying");
      }),
    log: (offer: string, type: string, description: string) =>
      run(async (tx) => {
        z.enum([
          "note",
          "call_logged",
          "email_logged",
          "followup_logged",
        ]).parse(type);
        z.string().trim().min(1).max(2000).parse(description);
        await tx.query(
          "insert into sales.activities(organization_id,offer_id,type,description) values($1,$2,$3,$4)",
          [orgId, offer, type, description],
        );
      }),
    activity: (offer?: string) =>
      run(
        async (tx) =>
          (
            await tx.query<TimelineItem>(
              `select id,description,type,occurred_at from sales.activities where organization_id=$1 ${offer ? "and offer_id=$2" : ""} order by occurred_at desc,id limit 50`,
              offer ? [orgId, offer] : [orgId],
            )
          ).rows,
      ),
    history: (audit: boolean, page: number) =>
      run(async (tx) => {
        const table = audit ? "audit_events" : "activities";
        const rows = await tx.query<HistoryRecord>(
          `select * from sales.${table} where organization_id=$1 order by occurred_at desc,id limit 30 offset $2`,
          [orgId, (page - 1) * 30],
        );
        const count = (
          await tx.query(
            `select count(*)::int n from sales.${table} where organization_id=$1`,
            [orgId],
          )
        ).rows[0].n;
        return { data: rows.rows, count };
      }),
    relatedOffers: (customer: string) =>
      run(
        async (tx) =>
          (
            await tx.query<Row>(
              "select id,title,status from sales.offers where organization_id=$1 and customer_id=$2 order by updated_at desc limit 25",
              [orgId, customer],
            )
          ).rows,
      ),
    imports: () =>
      run(
        async (tx) =>
          (
            await tx.query(
              "select id,file_name,status,row_count,duplicate_count,created_at,result from sales.import_jobs where organization_id=$1 order by created_at desc limit 30",
              [orgId],
            )
          ).rows,
      ),
    commitImport: (
      fileName: string,
      fingerprint: string,
      mapping: string,
      rows: unknown[],
      conflict: string,
    ) =>
      run(async (tx) => {
        const job = (
          await tx.query<{ id: string }>(
            "select sales.stage_import($1,$2,$3,$4,$5::jsonb) id",
            [orgId, fileName, fingerprint, mapping, JSON.stringify(rows)],
          )
        ).rows[0].id;
        const result = (
          await tx.query("select sales.commit_import($1,$2) result", [
            job,
            conflict,
          ])
        ).rows[0].result;
        return { job, result };
      }),
    dashboard: (s: Record<string, string | undefined>) =>
      run(async (tx) => {
        const c =
          s.currency && /^[A-Z]{3}$/.test(s.currency) ? s.currency : null;
        const customer = z.uuid().safeParse(s.customer).success
          ? s.customer
          : null;
        const from = z.iso.date().safeParse(s.from).success ? s.from : null;
        const to = z.iso.date().safeParse(s.to).success
          ? s.to + "T23:59:59Z"
          : null;
        const st = statuses.includes(s.status as (typeof statuses)[number])
          ? s.status
          : null;
        const metrics = (
          await tx.query<{ metrics: Metrics }>(
            "select sales.dashboard_metrics($1,$2,$3,$4,$5,$6) metrics",
            [orgId, c, customer, from, to, st],
          )
        ).rows[0].metrics;
        const offers = (
          await tx.query<PriorityOffer>(
            `select o.id,o.title,o.amount::text,o.currency,o.status,o.sent_at,c.display_name customer from sales.offers o join sales.customers c on c.id=o.customer_id and c.organization_id=o.organization_id where o.organization_id=$1 and o.archived_at is null and o.status='sent' and o.first_response_at is null and (now() at time zone 'UTC')::date-(o.sent_at at time zone 'UTC')::date >= (select followup_after_days from sales.organizations where id=$1) and ($2::text is null or o.currency=$2) and ($3::uuid is null or o.customer_id=$3) and ($4::timestamptz is null or o.created_at>=$4) and ($5::timestamptz is null or o.created_at<=$5) and ($6::text is null or o.status=$6) order by sent_at,id limit 10`,
            [orgId, c, customer, from, to, st],
          )
        ).rows;
        return { metrics, offers };
      }),
    profile: () =>
      run(
        async (tx) =>
          (
            await tx.query<{ display_name: string }>(
              "select display_name from sales.profiles where user_id=$1",
              [tx.user.id],
            )
          ).rows[0],
      ),
    saveProfile: (name: string) =>
      run(async (tx) => {
        await tx.query(
          "update sales.profiles set display_name=$1 where user_id=$2",
          [z.string().max(120).parse(name), tx.user.id],
        );
      }),
    saveOrganization: (input: Record<string, unknown>, version: string) =>
      run(async (tx) => {
        const v = z
          .object({
            name: z.string().trim().min(2).max(120),
            default_currency: z.string().regex(/^[A-Z]{3}$/),
            followup_after_days: z.coerce.number().int().min(1).max(365),
          })
          .parse(input);
        const m = (
          await tx.query<{ role: string }>(
            "select role from sales.organization_members where organization_id=$1 and user_id=$2",
            [orgId, tx.user.id],
          )
        ).rows[0];
        if (!["owner", "admin"].includes(m.role))
          throw new AccessError(403, "Owner or admin required");
        const r = await tx.query(
          "update sales.organizations set name=$1,default_currency=$2,followup_after_days=$3 where id=$4 and updated_at=$5 returning id",
          [v.name, v.default_currency, v.followup_after_days, orgId, version],
        );
        if (!r.rowCount)
          throw new AccessError(409, "Settings changed. Reload before saving");
      }),
    export: () =>
      run(
        async (tx) =>
          (
            await tx.query<Row>(
              "select title,exact_amount,currency,status,sent_at,external_reference from sales.offer_records where organization_id=$1 and archived_at is null order by id limit 1000",
              [orgId],
            )
          ).rows,
      ),
    options: (
      q: string,
      cq: string,
      customer: string | null,
      contact: string | null,
    ) =>
      run(async (tx) => ({
        customers: (
          await tx.query<Row>(
            "select id,display_name from sales.customers where organization_id=$1 and archived_at is null and display_name ilike $2 order by display_name limit 30",
            [orgId, "%" + q + "%"],
          )
        ).rows,
        selectedCustomer: customer
          ? (
              await tx.query<Row>(
                "select id,display_name from sales.customers where organization_id=$1 and id=$2",
                [orgId, customer],
              )
            ).rows[0] || null
          : null,
        contacts: customer
          ? (
              await tx.query<Row>(
                "select id,full_name,customer_id from sales.contacts where organization_id=$1 and customer_id=$2 and archived_at is null and full_name ilike $3 order by full_name limit 30",
                [orgId, customer, "%" + cq + "%"],
              )
            ).rows
          : [],
        selectedContact:
          customer && contact
            ? (
                await tx.query<Row>(
                  "select id,full_name,customer_id from sales.contacts where organization_id=$1 and customer_id=$2 and id=$3",
                  [orgId, customer, contact],
                )
              ).rows[0] || null
            : null,
      })),
  };
}
