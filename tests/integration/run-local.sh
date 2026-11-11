#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
d=(env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock)
name="ascivus-sales-test-$$"
trap '"${d[@]}" rm -f "$name" >/dev/null 2>&1 || true' EXIT
"${d[@]}" run --rm -d --name "$name" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
ready=0
for i in {1..60}; do
 if "${d[@]}" exec "$name" psql -U postgres -Atqc 'select 1' >/dev/null 2>&1; then ready=$((ready+1)); else ready=0; fi
 if [ "$ready" -ge 3 ]; then break; fi
 sleep 1
done
[ "$ready" -ge 3 ] || { echo 'Disposable database failed to start'; exit 1; }
"${d[@]}" exec -i "$name" psql -U postgres -v ON_ERROR_STOP=1 < tests/integration/bootstrap.sql
for f in supabase/migrations/*.sql; do "${d[@]}" exec -i "$name" psql -U postgres -v ON_ERROR_STOP=1 < "$f"; done
"${d[@]}" exec -i "$name" psql -U postgres -v ON_ERROR_STOP=1 < tests/integration/isolation.sql
