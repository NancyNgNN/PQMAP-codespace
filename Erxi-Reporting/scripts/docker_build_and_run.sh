#!/usr/bin/env bash
set -euo pipefail

# Build image (tags: pqmap-dev:py311)
docker build -t pqmap-dev:py311 .

# Run interactive shell in container with project mounted
# Use current user's UID/GID so files created by container are owned by you
docker run --rm -it \
  -u "$(id -u):$(id -g)" \
  -v "$(pwd)":/workspace -w /workspace \
  pqmap-dev:py311
