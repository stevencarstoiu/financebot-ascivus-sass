# Reuse and provider migration

Historical read-only source: `stevencarstoiu/trading-sass`, `ascivus-botlab/`, commit `cf0b0b0231d86fe90a5e6935a5c7cafe9ad83bba`. No source files/settings/secrets/deployments are modified.

The previous Sales phase adapted shell/form/interface-mode, typed entitlement and test/CI patterns from BotLab. No trading engine, simulator, bot route, Stripe price/customer, service key or AI client is included. This branch preserves the Sales UI, parser, business validation and demo; every active Supabase query/client/migration/test dependency is replaced.

| Previous Sales boundary | Neon replacement |
| --- | --- |
| Supabase SSR/session and callback links | server-only Managed Better Auth HTTP adapter, mandatory OTP, encrypted cookies and fresh session check |
| PostgREST clients and RPC calls | parameterized pg repository and verified transaction context |
| auth.users UUIDs / auth.uid() | opaque provider subject -> immutable internal profile UUID, explicit transaction actor |
| public/private provider migrations | isolated sales/sales_private schemas, dedicated roles, translated RLS/FKs/procedures |
| Supabase local CLI stack | disposable PostgreSQL + real local Better Auth test server; isolated hosted gate |

Guidance reviewed: installed Next 16 route handler/auth/DAL/typegen guides; official `neondatabase/neon-js` Managed Auth server proxy implementation/endpoints/Next guide; current Better Auth package exports/OTP plugin; official Neon plans documentation (2026-11-11 revision). Neon SDK's unused legacy UI/compatibility graph was omitted after audit; the used HTTP endpoint/header contract remains explicit and tested. No provider SDK behavior or hosted success is assumed from mocks.
