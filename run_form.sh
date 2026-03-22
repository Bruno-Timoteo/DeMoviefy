#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
venv_python="$root/.venv/bin/python"
script="$root/run_form.py"

if [[ -x "$venv_python" ]]; then
  py="$venv_python"
elif command -v python3 >/dev/null 2>&1; then
  py="python3"
elif command -v python >/dev/null 2>&1; then
  py="python"
else
  echo "Python not found in PATH. Install Python or add it to PATH." >&2
  exit 1
fi

exec "$py" "$script" "$@"
