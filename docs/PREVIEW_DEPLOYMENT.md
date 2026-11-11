# Preview — NOT DEPLOYED

No provider deployment URL is claimed. Publishing code to GitHub is separate from deploying the application. No hosted migration, Vercel project, payment, AI request or production change is performed by this publication.

## Existing Git target

The user authorized ONLY the EXISTING repository `https://github.com/stevencarstoiu/financebot-ascivus-sass`, branch `phase-1`. Do not create any repository. Preserve `main`; never force-push. The publication history starts from existing main commit `6b12b5fa1ab3248f0a07ef5752f7742b570c2511`. The original independent local completion commit `8aeef450bfc0b985006f1e8e67d48afcc0987fb6` is retained on `local/completed-phase-1` and is not pushed. This keeps excluded environment templates out of published history.

To obtain the publication branch after the push has been verified:

```bash
git clone --single-branch --branch phase-1 https://github.com/stevencarstoiu/financebot-ascivus-sass.git ascivus-sales-saas
cd ascivus-sales-saas
npm ci
```

No `.env*` files, generated Next declarations, build output, uploads, test sessions, credentials or real customer data belong in published commits. Configure local variables securely using [ENVIRONMENT.md](ENVIRONMENT.md).

## Remaining hosted prerequisites

- A separately designated non-production Supabase project and permission to apply the target migrations. Never choose the source BotLab project.
- A separate Vercel project/account with authorized Preview access and an exact callback origin.
- Test-only SMTP/allowed recipients, Auth/WAF rate limits, staging cleanup scheduling and hosted acceptance checks. Local mail-catcher delivery is verified; external delivery is not.
- Target-only variables entered securely in provider settings. The app requires no service-role secret.

## New non-production database

Create/designate a separate target Supabase project manually after reviewing any account/cost implications. Review all numbered SQL files; apply them in order to that new test project only. CLI alternative, after positively verifying the target project reference:

```bash
npx supabase login
npx supabase link --project-ref YOUR_NEW_NONPRODUCTION_PROJECT_REF
npx supabase db push --dry-run
# Inspect proposed target/migrations before applying:
npx supabase db push
```

These hosted commands have NOT been executed. Never use `db reset` against a hosted project. Configure email confirmation on, password minimum 12, correct site URL and exact allowlisted `https://YOUR_PREVIEW_HOST/auth/callback` and recovery callback `https://YOUR_PREVIEW_HOST/auth/callback?next=/reset-password`. Enable refresh-token rotation. Configure hosted Auth/WAF rate limits and restricted test mail delivery. Do not reuse local relaxed email limits.

## Separate Vercel Preview

Import only branch `phase-1` of the existing `stevencarstoiu/financebot-ascivus-sass` repository into a separate Vercel project; Next.js framework, repo root, Node 24, install `npm ci`, build `npm run build`. Set target-only Preview variables:

```
NEXT_PUBLIC_SITE_URL=https://YOUR_EXACT_PREVIEW_HOST
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_NEW_TEST_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<enter securely in provider settings>
```

Provide public build variables before building. Deploy a non-production branch Preview, never `--prod`; review any project/plan costs manually. CLI alternative after explicitly linking the NEW Vercel project: `npx vercel` (default Preview). This command is not executed here. Use only the real returned URL; adjust exact callback origin and redeploy if the initial URL differs. Keep Preview access restrictions on during verification.

## Mandatory hosted gates

- Verify landing/demo, no Supabase calls from demo, and unavailable-config behavior.
- Use two synthetic users in the new project; confirmation and recovery must reach designated test mailboxes and redirect correctly.
- Complete onboarding/customer/contact/offer/CSV and XLSX preview+commit/dashboard/activity/logout.
- Repeat direct REST membership/FK/actor/audit/anonymous-denial checks against that NEW project. Current automated connected runner intentionally refuses any non-local target; add a separately guarded hosted test harness rather than weakening that guard.
- Check HTTPS cookies, refresh, cache-control, no shared personal responses, Server Action origin checks, browser error logs, mobile/keyboard behavior, and permission failures.
- Check provider function request limits. The app accepts 5 MB, but a provider may enforce a smaller limit. Resolve before advertising maximum-size uploads.
- Configure privileged staging cleanup; confirm no application service key; legal/privacy terms remain drafts.

Publication/snapshot of the cloud environment is separate from Git publication or a Vercel deployment. Neither has been claimed.
