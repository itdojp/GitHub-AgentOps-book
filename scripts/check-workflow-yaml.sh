#!/usr/bin/env bash
set -euo pipefail

# Official release asset pins. Update version, asset SHA-256 values, and URL
# together after reviewing https://github.com/rhysd/actionlint/releases.
readonly ACTIONLINT_VERSION='1.7.12'
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)
    readonly ACTIONLINT_ASSET="actionlint_${ACTIONLINT_VERSION}_linux_amd64.tar.gz"
    readonly ACTIONLINT_SHA256='8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8'
    ;;
  Linux-aarch64 | Linux-arm64)
    readonly ACTIONLINT_ASSET="actionlint_${ACTIONLINT_VERSION}_linux_arm64.tar.gz"
    readonly ACTIONLINT_SHA256='325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6'
    ;;
  Darwin-x86_64)
    readonly ACTIONLINT_ASSET="actionlint_${ACTIONLINT_VERSION}_darwin_amd64.tar.gz"
    readonly ACTIONLINT_SHA256='5b44c3bc2255115c9b69e30efc0fecdf498fdb63c5d58e17084fd5f16324c644'
    ;;
  Darwin-arm64)
    readonly ACTIONLINT_ASSET="actionlint_${ACTIONLINT_VERSION}_darwin_arm64.tar.gz"
    readonly ACTIONLINT_SHA256='aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f'
    ;;
  *)
    printf 'ERROR: actionlint gate supports Linux/macOS on x86_64/arm64; got %s/%s\n' \
      "$(uname -s)" "$(uname -m)" >&2
    exit 1
    ;;
esac
readonly ACTIONLINT_URL="https://github.com/rhysd/actionlint/releases/download/v${ACTIONLINT_VERSION}/${ACTIONLINT_ASSET}"
readonly CACHE_DIR="${ACTIONLINT_CACHE_DIR:-node_modules/.cache/actionlint-${ACTIONLINT_VERSION}-$(uname -s)-$(uname -m)}"
readonly ARCHIVE="${CACHE_DIR}/actionlint.tar.gz"
readonly BINARY="${CACHE_DIR}/actionlint"

mkdir -p "${CACHE_DIR}"
if [[ ! -f "${ARCHIVE}" ]]; then
  curl --proto '=https' --tlsv1.2 --location --fail --silent --show-error \
    --retry 3 --retry-delay 2 --output "${ARCHIVE}" "${ACTIONLINT_URL}"
fi
actual_sha256="$(node -e \
  'const crypto=require("crypto"),fs=require("fs"); console.log(crypto.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"));' \
  "${ARCHIVE}")"
if [[ "${actual_sha256}" != "${ACTIONLINT_SHA256}" ]]; then
  printf 'ERROR: actionlint archive checksum mismatch: %s\n' "${ARCHIVE}" >&2
  exit 1
fi
tar -xzf "${ARCHIVE}" -C "${CACHE_DIR}" actionlint

workflow_files=()
while IFS= read -r -d '' workflow_file; do
  workflow_files+=("${workflow_file}")
done < <(find .github/workflows templates/github-workflows -type f \
  \( -name '*.yml' -o -name '*.yaml' \) -print0)
if [[ ${#workflow_files[@]} -eq 0 ]]; then
  printf 'ERROR: no workflow/template YAML files found\n' >&2
  exit 1
fi

"${BINARY}" "${workflow_files[@]}"
printf 'OK: actionlint %s checked %d workflow/template files\n' \
  "${ACTIONLINT_VERSION}" "${#workflow_files[@]}"
