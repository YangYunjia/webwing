
#!/bin/bash

# Load variables from .env file
set -a
source .env
set +a

# === Create uvicorn service ===
echo "Creating uvicorn.service..."
$SUDO tee /etc/systemd/system/uvicorn.service > /dev/null <<EOF
[Unit]
Description=Uvicorn FastAPI application
After=network.target

[Service]
User=$USER_NAME
Group=$USER_NAME
WorkingDirectory=$APP_DIR
ExecStart=$VENV_DIR/bin/uvicorn $UVICORN_MODULE --host 127.0.0.1 --port 8000 --workers 2 --timeout-keep-alive 30 --proxy-headers --forwarded-allow-ips=127.0.0.1
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# === Create celery service ===
echo "Creating celery.service..."
$SUDO tee /etc/systemd/system/celery.service > /dev/null <<EOF
[Unit]
Description=Celery Worker Service
After=network.target

[Service]
Type=simple
User=$USER_NAME
Group=$USER_NAME
WorkingDirectory=$APP_DIR
Environment="PYTHONPATH=$APP_DIR"
ExecStart=$VENV_DIR/bin/celery -A $CELERY_APP worker --loglevel=WARNING
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# === Reload systemd, enable and start services ===
echo "Reloading systemd and enabling services..."
$SUDO systemctl daemon-reload
$SUDO systemctl enable uvicorn
$SUDO systemctl enable celery

restart_or_start() {
  local service_name="$1"
  if $SUDO systemctl is-active --quiet "$service_name"; then
    echo "$service_name is running, restarting to apply latest config..."
    $SUDO systemctl restart "$service_name"
  else
    echo "$service_name is not running, starting..."
    $SUDO systemctl start "$service_name"
  fi
}

restart_or_start uvicorn
restart_or_start celery
restart_or_start redis

# === Show service status ===
echo ""
echo "Service status:"
$SUDO systemctl status uvicorn --no-pager
$SUDO systemctl status celery --no-pager
$SUDO systemctl status redis --no-pager
