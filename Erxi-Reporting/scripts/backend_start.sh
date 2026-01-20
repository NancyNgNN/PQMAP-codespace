#!/usr/bin/env bash
set -euo pipefail

# Wrapper to start uvicorn if the specified module exists, otherwise drop to shell.
# Expects UVICORN_APP env var in form module:app (default main:app)

UVICORN_APP="${UVICORN_APP:-main:app}"
MODULE=${UVICORN_APP%%:*}
APP=${UVICORN_APP#*:}

# Try to import module
if python - <<PY
import importlib, sys
try:
    importlib.import_module('${MODULE}')
    sys.exit(0)
except Exception as e:
    print('Module import failed:', e)
    sys.exit(1)
PY
then
  echo "Starting uvicorn for ${UVICORN_APP}"
  exec uvicorn "${UVICORN_APP}" --host 0.0.0.0 --port 8000 --reload
else
  echo "Could not import module '${MODULE}'. Dropping to shell for debugging."
  exec /bin/bash
fi
