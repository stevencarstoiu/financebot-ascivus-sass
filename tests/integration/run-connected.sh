#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# Only this explicitly designated disposable LOCAL project may be reset.
rg -q '^project_id = "ascivus-sales-disposable"$' supabase/config.toml || { echo 'Refusing unknown stack'; exit 1; }
umask 077
status_file=$(mktemp /tmp/ascivus-sales-status-XXXXXX.json)
start_log=$(mktemp /tmp/ascivus-sales-start-XXXXXX.log)
trap 'rm -f "$status_file" "$start_log"' EXIT
flags=()
# Optional workaround for a cloud proxy incorrectly intercepting Docker's LOCAL health probe.
# Actual Auth HTTP, Auth sessions, REST and browser checks below remain mandatory.
if [ "${ASCIVUS_LOCAL_PROXY_HEALTH:-0}" = 1 ]; then flags+=(--ignore-health-check); fi
if ! npx supabase start "${flags[@]}" >"$start_log" 2>&1; then
 echo 'Disposable stack failed to start. Inspect local Docker health; no readiness claimed.' >&2
 exit 1
fi
curl -fsS --max-time 10 http://127.0.0.1:55421/auth/v1/health >/dev/null
npx supabase db reset --local --no-seed >/dev/null
npx supabase status -o json > "$status_file"
node tests/integration/connected-runner.mjs "$status_file"
