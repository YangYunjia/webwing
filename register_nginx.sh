#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${1:-$PROJECT_ROOT/.env}"
NGINX_TEMPLATE_PATH="$PROJECT_ROOT/nginx.conf"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: env file not found: $ENV_FILE"
    exit 1
fi

set -a
source "$ENV_FILE"
set +a

echo "Installing system packages..."
$SUDO apt update
$SUDO apt install -y nginx redis-server certbot python3-certbot-nginx

NGINX_AVAILABLE_PATH="/etc/nginx/sites-available/$DOMAIN_NAME"
NGINX_ENABLED_PATH="/etc/nginx/sites-enabled/$DOMAIN_NAME"

tmp_conf="$(mktemp)"
sed \
    -e "s/webwing\.example/$DOMAIN_NAME/g" \
    "$NGINX_TEMPLATE_PATH" > "$tmp_conf"

echo "Installing nginx site config: $NGINX_AVAILABLE_PATH"
$SUDO cp "$tmp_conf" "$NGINX_AVAILABLE_PATH"
rm -f "$tmp_conf"

$SUDO ln -sfn "$NGINX_AVAILABLE_PATH" "$NGINX_ENABLED_PATH"
$SUDO rm -f /etc/nginx/sites-enabled/default

echo "Issuing certificate with certbot (standalone)..."
$SUDO systemctl stop nginx || true
$SUDO certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$CERTBOT_EMAIL" \
    --domain "$DOMAIN_NAME" \
    --keep-until-expiring

echo "Validating nginx configuration..."
$SUDO nginx -t

echo "Restarting services..."
$SUDO systemctl enable nginx
$SUDO systemctl restart nginx

echo "Done."
echo "Check status with:"
echo "  $SUDO systemctl status nginx --no-pager"
