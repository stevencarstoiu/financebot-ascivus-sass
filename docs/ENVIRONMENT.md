# Environment configuration

No `.env*` files are published. Create an ignored `.env.local` locally, or enter these variables securely in the Preview provider settings:

```dotenv
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3001
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Fill the URL/publishable key only for the designated disposable Sales Supabase stack or a separately authorized non-production project. Never copy BotLab credentials. No service-role key belongs in application configuration. For the prepared local stack, run `npm run dev -- --port 3001`. For hosted builds, set the exact HTTPS Preview origin and target public variables before building.

Keep actual values out of commits, logs and screenshots. `.env*`, generated Next declarations, dependencies, build output, test sessions and Supabase temporary state are ignored. `npm run typecheck` runs the official `next typegen` step before strict TypeScript validation, so generated declarations need not be committed.
