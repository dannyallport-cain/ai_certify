#!/usr/bin/env bash
set -euo pipefail

REPO_OWNER="${REPO_OWNER:-dannyallport-cain}"
REPO_NAME="${REPO_NAME:-ai_certify}"
REPO_REF="${REPO_REF:-main}"
ASSET_BASE_URL="${ASSET_BASE_URL:-https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_REF}/railway-ai-worker/deploy/oracle-ollama}"
INSTALL_DIR="${INSTALL_DIR:-/opt/ollama-bootstrap}"
RUN_BOOTSTRAP="${RUN_BOOTSTRAP:-true}"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "This script must be run as root. Example:"
    echo "  sudo bash install-from-github.sh"
    exit 1
  fi
}

require_tools() {
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y curl ca-certificates
}

download_asset() {
  local filename="$1"
  local destination="${INSTALL_DIR}/${filename}"

  echo "Downloading ${filename}..."
  curl -fsSL "${ASSET_BASE_URL}/${filename}" -o "${destination}"
  chmod 0644 "${destination}"
}

main() {
  require_root
  require_tools

  mkdir -p "${INSTALL_DIR}"

  download_asset "bootstrap-ubuntu-ollama.sh"
  download_asset "ollama-compose.yaml"
  download_asset "ollama.service"
  download_asset "nginx-ollama.conf"
  download_asset "README.md"

  chmod +x "${INSTALL_DIR}/bootstrap-ubuntu-ollama.sh"

  cat <<EOF
Downloaded Oracle Ollama deployment assets to:
  ${INSTALL_DIR}

Source:
  ${ASSET_BASE_URL}

Files:
  - bootstrap-ubuntu-ollama.sh
  - ollama-compose.yaml
  - ollama.service
  - nginx-ollama.conf
  - README.md
EOF

  if [[ "${RUN_BOOTSTRAP}" == "true" ]]; then
    echo "Running bootstrap-ubuntu-ollama.sh..."
    cd "${INSTALL_DIR}"
    ./bootstrap-ubuntu-ollama.sh
  else
    echo "Skipping bootstrap execution because RUN_BOOTSTRAP=${RUN_BOOTSTRAP}"
    echo "Run it manually with:"
    echo "  cd ${INSTALL_DIR} && sudo ./bootstrap-ubuntu-ollama.sh"
  fi
}

main "$@"
