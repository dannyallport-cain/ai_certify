# Oracle Always Free Ollama deployment

This directory contains lightweight deployment assets for running a small CPU-only Ollama instance on an Oracle Cloud Always Free Ampere A1 Ubuntu VM, then pointing the Railway AI worker at it.

This setup is intended for:

- Oracle Cloud Ampere A1 ARM VMs
- Ubuntu 22.04 or 24.04
- CPU-only inference
- Small models only
- Private or tightly restricted network exposure

Recommended use cases:

- Development and low-volume internal usage
- Cost-sensitive prototypes
- Simple self-hosted inference for the Railway worker

Not recommended for:

- Large models
- High concurrency
- Public unauthenticated exposure
- Low-latency production workloads

## Files

- `bootstrap-ubuntu-ollama.sh` - bootstraps Docker, Nginx, firewall rules, and directories on Ubuntu
- `ollama-compose.yaml` - Docker Compose file for running Ollama in a restartable container
- `ollama.service` - optional systemd unit for managing the Compose stack at boot
- `nginx-ollama.conf` - reverse proxy example for HTTPS-ready exposure through Nginx

## Recommended model sizes

Oracle Always Free Ampere A1 is useful for small models, but it is still CPU-only. Start small.

Good starting points:

- `qwen2.5:1.5b`
- `qwen2.5:3b`
- `gemma2:2b`
- `llama3.2:3b`

Practical advice:

- Prefer 1.5B to 3B class models first
- Use quantized models where available
- Expect slower responses than hosted GPU providers
- Keep request concurrency low

## High-level architecture

A simple production-ish layout:

1. Ollama runs in Docker and listens on `127.0.0.1:11434`
2. Nginx listens on ports `80` and `443`
3. Nginx proxies requests to the local Ollama container
4. Access is restricted by firewall, reverse-proxy auth, IP allowlists, or all three
5. The Railway worker uses:
   - `LOCAL_LLM_PROVIDER=ollama`
   - `LOCAL_LLM_BASE_URL=https://your-ollama-host.example.com`
   - `LOCAL_LLM_MODEL=qwen2.5:3b`

## Before you start

You should already have:

- An Oracle Cloud account
- An Always Free Ampere A1 VM
- Ubuntu installed
- SSH access working
- A public IP attached
- A DNS name if you want HTTPS with Let's Encrypt

Recommended Oracle VM shape guidance:

- Use Ampere A1
- Allocate enough RAM for the model you want to load
- Keep expectations modest for throughput

## Network and security guidance

Do **not** expose raw Ollama broadly to the public internet without controls.

At minimum, do one or more of the following:

- Restrict ingress in the Oracle VCN security list or network security group
- Restrict ingress with UFW on the VM
- Put Nginx in front of Ollama
- Require HTTP basic auth at Nginx
- Allow only Railway egress IPs if your plan/networking allows it
- Use HTTPS
- Keep Ollama bound to localhost behind the reverse proxy

Recommended ports:

- `22/tcp` - SSH, restricted to your IP
- `80/tcp` - optional for ACME/redirect
- `443/tcp` - HTTPS
- Do not expose `11434/tcp` publicly

## Quick start

### One-command bootstrap from GitHub

SSH into the VM and run:

```bash
sudo apt-get update && sudo apt-get install -y curl
curl -fsSL https://raw.githubusercontent.com/dannyallport-cain/ai_certify/main/railway-ai-worker/deploy/oracle-ollama/install-from-github.sh -o install-from-github.sh
chmod +x install-from-github.sh
sudo ./install-from-github.sh
```

This downloader script pulls the deployment assets into `/opt/ollama-bootstrap` and then runs `bootstrap-ubuntu-ollama.sh` automatically.

Optional overrides:

```bash
sudo REPO_REF=main INSTALL_DIR=/opt/ollama-bootstrap RUN_BOOTSTRAP=true ./install-from-github.sh
```

### Manual bootstrap from a local copy

If you already copied this repo or just want to run the local bootstrap directly:

```bash
chmod +x bootstrap-ubuntu-ollama.sh
sudo ./bootstrap-ubuntu-ollama.sh
```

If you are copying files manually from this repo instead of downloading them directly, place them under `/opt/ollama` as shown below.

## Manual installation steps

### 1. Copy assets to the VM

Copy these files to the VM:

- `ollama-compose.yaml` -> `/opt/ollama/ollama-compose.yaml`
- `nginx-ollama.conf` -> `/etc/nginx/sites-available/ollama`
- `ollama.service` -> `/etc/systemd/system/ollama.service`

Create directories:

```bash
sudo mkdir -p /opt/ollama
sudo mkdir -p /opt/ollama/data
sudo mkdir -p /opt/ollama/nginx-auth
```

### 2. Start Ollama

Using Docker Compose:

```bash
cd /opt/ollama
sudo docker compose -f ollama-compose.yaml up -d
```

Check health:

```bash
sudo docker ps
curl http://127.0.0.1:11434/api/tags
```

### 3. Pull a small model

Inside the running container:

```bash
sudo docker exec -it ollama ollama pull qwen2.5:3b
sudo docker exec -it ollama ollama list
```

You can change the model later. Start with one model only.

### 4. Enable systemd startup

```bash
sudo cp /path/to/ollama.service /etc/systemd/system/ollama.service
sudo systemctl daemon-reload
sudo systemctl enable ollama.service
sudo systemctl start ollama.service
sudo systemctl status ollama.service
```

### 5. Configure Nginx

Copy the site config:

```bash
sudo cp /path/to/nginx-ollama.conf /etc/nginx/sites-available/ollama
sudo ln -sf /etc/nginx/sites-available/ollama /etc/nginx/sites-enabled/ollama
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Optional: add basic auth

Create an htpasswd file using OpenSSL:

```bash
OLLAMA_USER=railway
OLLAMA_PASSWORD='replace-with-a-long-random-password'
HASH="$(openssl passwd -apr1 "$OLLAMA_PASSWORD")"
echo "${OLLAMA_USER}:${HASH}" | sudo tee /opt/ollama/nginx-auth/.htpasswd >/dev/null
```

Then uncomment the auth lines in `nginx-ollama.conf` and reload Nginx.

## HTTPS setup

If you have DNS pointed at the VM, use Certbot:

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-ollama-host.example.com
```

After that, your public base URL will be:

```text
https://your-ollama-host.example.com
```

Use that value for the Railway worker's `LOCAL_LLM_BASE_URL`.

## Firewall setup

The bootstrap script enables UFW and allows:

- `OpenSSH`
- `80/tcp`
- `443/tcp`

It intentionally does **not** allow `11434/tcp`.

You should also restrict traffic at the Oracle cloud network layer, not just on the VM.

## Railway worker configuration

In Railway, set:

```env
LOCAL_LLM_PROVIDER=ollama
LOCAL_LLM_BASE_URL=https://your-ollama-host.example.com
LOCAL_LLM_MODEL=qwen2.5:3b
```

If you enabled reverse-proxy auth, include credentials in the URL if your deployment model permits it, for example:

```env
LOCAL_LLM_BASE_URL=https://username:password@your-ollama-host.example.com
```

If you do this, treat the variable as a secret and avoid logging it.

Then verify from the Railway worker:

```text
GET /health?probeProvider=true
```

A successful response should include `localLlm` metadata and a healthy provider probe.

## Operational tips

- Keep disk space available because models are large
- Monitor memory pressure with `free -h`
- Monitor container logs with `sudo docker logs -f ollama`
- Restart cleanly with `sudo systemctl restart ollama`
- Upgrade carefully and re-test model loading time after upgrades

Useful commands:

```bash
sudo docker exec -it ollama ollama list
sudo docker exec -it ollama ollama ps
curl -s http://127.0.0.1:11434/api/tags
sudo journalctl -u ollama.service -n 100 --no-pager
```

## Updating models

Pull a different model:

```bash
sudo docker exec -it ollama ollama pull gemma2:2b
```

Then update Railway:

```env
LOCAL_LLM_MODEL=gemma2:2b
```

You do not usually need to redeploy the VM for a model change.

## Troubleshooting

### Nginx returns 502

Check:

```bash
sudo docker ps
curl http://127.0.0.1:11434/api/tags
sudo nginx -t
sudo journalctl -u nginx -n 100 --no-pager
```

### Model is too slow

- Use a smaller model
- Reduce concurrent requests
- Increase VM resources if you move off Always Free
- Avoid long prompts and huge images if your application path allows

### Out of memory

- Switch to a smaller model
- Ensure no other large services run on the VM
- Restart the container after freeing memory

### Railway health probe fails

Confirm:

- `LOCAL_LLM_PROVIDER=ollama`
- `LOCAL_LLM_BASE_URL` is reachable from the public internet or from your private network path
- The reverse proxy returns successful responses
- TLS certificate is valid
- Auth credentials are correct if enabled

## Customization notes

These files are intentionally generic. You should edit them for your environment:

- Domain name
- Allowed client IPs
- Authentication settings
- Compose volume path
- Chosen model
- TLS settings

For the simplest secure setup, prefer:

- Ollama on localhost only
- Nginx with HTTPS
- Basic auth or IP allowlisting
- Railway pointing at the Nginx URL, not the raw Ollama port
