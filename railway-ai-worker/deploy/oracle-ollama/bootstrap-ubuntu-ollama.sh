#!/usr/bin/env bash
set -euo pipefail

OLLAMA_DIR="${OLLAMA_DIR:-/opt/ollama}"
OLLAMA_DATA_DIR="${OLLAMA_DATA_DIR:-${OLLAMA_DIR}/data}"
OLLAMA_AUTH_DIR="${OLLAMA_AUTH_DIR:-${OLLAMA_DIR}/nginx-auth}"
COMPOSE_FILE="${COMPOSE_FILE:-${OLLAMA_DIR}/ollama-compose.yaml}"
SERVICE_FILE="${SERVICE_FILE:-/etc/systemd/system/ollama.service}"
NGINX_SITE_AVAILABLE="${NGINX_SITE_AVAILABLE:-/etc/nginx/sites-available/ollama}"
NGINX_SITE_ENABLED="${NGINX_SITE_ENABLED:-/etc/nginx/sites-enabled/ollama}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "This script must be run as root. Example: sudo ./bootstrap-ubuntu-ollama.sh"
    exit 1
  fi
}

install_packages() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y ca-certificates curl gnupg nginx ufw openssl
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    echo "Docker already installed, skipping package installation."
    return
  fi

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
}

prepare_directories() {
  mkdir -p "${OLLAMA_DIR}"
  mkdir -p "${OLLAMA_DATA_DIR}"
  mkdir -p "${OLLAMA_AUTH_DIR}"
}

copy_assets() {
  if [[ -f "${SCRIPT_DIR}/ollama-compose.yaml" ]]; then
    cp "${SCRIPT_DIR}/ollama-compose.yaml" "${COMPOSE_FILE}"
  fi

  if [[ -f "${SCRIPT_DIR}/ollama.service" ]]; then
    cp "${SCRIPT_DIR}/ollama.service" "${SERVICE_FILE}"
  fi

  if [[ -f "${SCRIPT_DIR}/nginx-ollama.conf" ]]; then
    cp "${SCRIPT_DIR}/nginx-ollama.conf" "${NGINX_SITE_AVAILABLE}"
    ln -sf "${NGINX_SITE_AVAILABLE}" "${NGINX_SITE_ENABLED}"
  fi
}

configure_firewall() {
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
}

start_stack() {
  if [[ -f "${COMPOSE_FILE}" ]]; then
    docker compose -f "${COMPOSE_FILE}" up -d
  fi
}

enable_service() {
  if [[ -f "${SERVICE_FILE}" ]]; then
    systemctl daemon-reload
    systemctl enable ollama.service
    systemctl restart ollama.service
  fi
}

check_nginx() {
  if [[ -f "${NGINX_SITE_AVAILABLE}" ]]; then
    nginx -t
    systemctl enable nginx
    systemctl restart nginx
  fi
}

print_next_steps() {
  cat <<'EOF'
Bootstrap complete.

Next steps:
1. Pull a small model:
   sudo docker exec -it ollama ollama pull qwen2.5:3b

2. Test Ollama locally:
   curl http://127.0.0.1:11434/api/tags

3. Optional: create Nginx basic auth credentials:
   OLLAMA_USER=railway
   OLLAMA_PASSWORD='replace-with-a-long-random-password'
   HASH="$(openssl passwd -apr1 "$OLLAMA_PASSWORD")"
   echo "${OLLAMA_USER}:${HASH}" | sudo tee /opt/ollama/nginx-auth/.htpasswd >/dev/null

4. Optional: enable HTTPS with Certbot once DNS is configured:
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-ollama-host.example.com

5. In Railway, configure:
   LOCAL_LLM_PROVIDER=ollama
   LOCAL_LLM_BASE_URL=https://your-ollama-host.example.com
   LOCAL_LLM_MODEL=qwen2.5:3b

Security reminders:
- Do not expose port 11434 publicly.
- Keep Ollama behind Nginx and preferably behind HTTPS.
- Restrict access with Oracle network rules, UFW, auth, or IP allowlists.
EOF
}

require_root
install_packages
install_docker
prepare_directories
copy_assets
configure_firewall
start_stack
enable_service
check_nginx
print_next_steps