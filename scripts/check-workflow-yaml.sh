#!/usr/bin/env bash
set -euo pipefail

# Official release asset pin. Update version, URL, and SHA-256 together after
# reviewing https://github.com/rhysd/actionlint/releases.
readonly ACTIONLINT_VERSION='1.7.12'
readonly ACTIONLINT_SHA256='8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8'
readonly ACTIONLINT_URL="https://github.com/rhysd/actionlint/releases/download/v${ACTIONLINT_VERSION}/actionlint_${ACTIONLINT_VERSION}_linux_amd64.tar.gz"
readonly CACHE_DIR="${ACTIONLINT_CACHE_DIR:-node_modules/.cache/actionlint-${ACTIONLINT_VERSION}}"
readonly ARCHIVE="${CACHE_DIR}/actionlint.tar.gz"
readonly BINARY="${CACHE_DIR}/actionlint"

mkdir -p "${CACHE_DIR}"
if [[ ! -f "${ARCHIVE}" ]]; then
  curl --proto '=https' --tlsv1.2 --location --fail --silent --show-error \
    --retry 3 --retry-all-errors --output "${ARCHIVE}" "${ACTIONLINT_URL}"
fi
printf '%s  %s\n' "${ACTIONLINT_SHA256}" "${ARCHIVE}" | sha256sum --check --status || {
  printf 'ERROR: actionlint archive checksum mismatch: %s\n' "${ARCHIVE}" >&2
  exit 1
}
tar -xzf "${ARCHIVE}" -C "${CACHE_DIR}" actionlint

mapfile -d '' workflow_files < <(
  find .github/workflows templates/github-workflows -type f \
    \( -name '*.yml' -o -name '*.yaml' \) -print0 | sort -z
)
if [[ ${#workflow_files[@]} -eq 0 ]]; then
  printf 'ERROR: no workflow/template YAML files found\n' >&2
  exit 1
fi

"${BINARY}" "${workflow_files[@]}"
printf 'OK: actionlint %s checked %d workflow/template files\n' \
  "${ACTIONLINT_VERSION}" "${#workflow_files[@]}"
