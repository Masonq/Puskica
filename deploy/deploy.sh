#!/usr/bin/env bash
# Деплой Puškica. Запуск: bash /opt/puskica/deploy/deploy.sh
# Пишет отчёт в reports/deploy-latest.txt и пушит его в git.
set -uo pipefail
[ "$(id -u)" -eq 0 ] || exec sudo bash "$0" "$@"

ROOT=/opt/puskica
DOMAIN_DEFAULT="puskica.89-208-113-147.sslip.io"
cd "$ROOT" || exit 1
mkdir -p reports
REPORT="$ROOT/reports/deploy-latest.txt"
exec 3>&1 4>&2
exec > >(tee "$REPORT") 2>&1

step() { echo; echo "=== $* ($(date -u +%H:%M:%S) UTC)"; }
fail() { echo "FAIL: $*"; FAILED=1; }
FAILED=0
export DEBIAN_FRONTEND=noninteractive

step "Версия"
echo "commit: $(git rev-parse --short HEAD) $(git log -1 --format=%s)"
echo "host: $(hostname), $(lsb_release -ds 2>/dev/null)"
echo "ram: $(free -m | awk '/Mem/{print $2" MB, свободно "$7" MB"}'), swap: $(free -m | awk '/Swap/{print $2" MB"}')"
echo "disk: $(df -h / | awk 'NR==2{print $4" свободно из "$2}')"

step "Swap (нужен для сборки Next.js на малой памяти)"
if [ "$(free -m | awk '/Swap/{print $2}')" -lt 1000 ] && [ "$(free -m | awk '/Mem/{print $2}')" -lt 3500 ] && [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile && echo "/swapfile none swap sw 0 0" >> /etc/fstab && echo "swap 2G создан"
else
  echo "ok"
fi

step "Пакеты"
need=()
command -v docker >/dev/null || need+=(docker.io)
docker compose version >/dev/null 2>&1 || need+=(docker-compose-v2)
command -v nginx >/dev/null || need+=(nginx)
command -v certbot >/dev/null || need+=(certbot python3-certbot-nginx)
if [ ${#need[@]} -gt 0 ]; then
  echo "ставлю: ${need[*]}"
  apt-get update -qq && apt-get install -y -qq "${need[@]}" >/dev/null || fail "apt install"
fi
systemctl enable --now docker >/dev/null 2>&1
docker --version; docker compose version | head -1; nginx -v 2>&1; certbot --version 2>&1

step "Порт 80/443"
holder=$(ss -ltnp '( sport = :80 or sport = :443 )' 2>/dev/null | awk 'NR>1{print $NF}' | grep -o '"[^"]*"' | sort -u | tr '\n' ' ')
echo "слушают: ${holder:-никто}"
if [ -n "$holder" ] && ! echo "$holder" | grep -q nginx; then fail "порт 80/443 занят не nginx: $holder"; fi

step ".env"
if [ ! -f .env ]; then
  cat > .env <<EOF
DOMAIN=$DOMAIN_DEFAULT
INDEXABLE=0
DB_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_TOKEN=$(openssl rand -hex 24)
EOF
  chmod 600 .env
  echo "создан"
else
  echo "есть"
fi
set -a; . ./.env; set +a
echo "домен: $DOMAIN, индексация: $INDEXABLE"

step "Сборка и запуск контейнеров"
docker compose -f deploy/docker-compose.yml --env-file .env up -d --build --remove-orphans 2>&1 | grep -vE "^\s*#|^ => |sha256|exporting|naming to|writing image" | tail -40 || fail "docker compose"
docker image prune -f >/dev/null 2>&1

step "Ожидание сервисов"
for i in $(seq 1 60); do
  a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8710/api/health)
  w=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3710/)
  [ "$a" = 200 ] && [ "$w" = 200 ] && break
  sleep 3
done
echo "api: $a, web: $w (через ${i} попыток)"
[ "$a" = 200 ] || { fail "api не поднялся"; docker compose -f deploy/docker-compose.yml logs --tail 40 api; }
[ "$w" = 200 ] || { fail "web не поднялся"; docker compose -f deploy/docker-compose.yml logs --tail 40 web; }

step "nginx"
CONF=/etc/nginx/sites-available/puskica.conf
ROBOTS=""
[ "$INDEXABLE" = "1" ] || ROBOTS='add_header X-Robots-Tag "noindex, nofollow" always;'
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then HAVE_CERT=1; else HAVE_CERT=0; fi
V6=0; [ -s /proc/net/if_inet6 ] && V6=1
l() { echo -n "listen $1;"; [ "$V6" = 1 ] && echo -n " listen [::]:$1;"; }
render() {
  local listen_block
  if [ "$1" = 1 ]; then
    listen_block="$(l "443 ssl http2")
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:pkssl:10m;
    ssl_session_timeout 1d;"
  else
    listen_block="$(l 80)"
  fi
  cat <<EOF
# Puškica — сгенерировано deploy.sh
$( [ "$1" = 1 ] && echo "server { $(l 80) server_name $DOMAIN; location /.well-known/acme-challenge/ { root /var/www/html; } location / { return 301 https://\$host\$request_uri; } }" )
server {
    $listen_block
    server_name $DOMAIN;
    client_max_body_size 30m;
    $ROBOTS
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location /.well-known/acme-challenge/ { root /var/www/html; }

    location /api/ {
        proxy_pass http://127.0.0.1:8710;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        proxy_request_buffering off;
    }

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3710;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    location / {
        proxy_pass http://127.0.0.1:3710;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        # HTML никогда не кэшируется браузером — после деплоя сразу новая версия
        proxy_hide_header Cache-Control;
        add_header Cache-Control "no-cache, must-revalidate" always;
        add_header X-Content-Type-Options nosniff always;
        add_header Referrer-Policy strict-origin-when-cross-origin always;
        $ROBOTS
    }
}
EOF
}
mkdir -p /var/www/html
render "$HAVE_CERT" > "$CONF"
ln -sf "$CONF" /etc/nginx/sites-enabled/puskica.conf
nginx -t 2>&1 | tail -2 && systemctl reload nginx || fail "nginx -t"

if [ "$HAVE_CERT" = 0 ]; then
  step "HTTPS сертификат"
  certbot certonly --webroot -w /var/www/html -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email 2>&1 | tail -4
  if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    render 1 > "$CONF"
    nginx -t 2>&1 | tail -1 && systemctl reload nginx || fail "nginx после сертификата"
  else
    fail "сертификат не получен"
  fi
fi

step "Проверки снаружи (https://$DOMAIN)"
B="https://$DOMAIN"
chk() { r=$(curl -s -o /tmp/pk_body -w '%{http_code} %{time_total}s' "$B$1"); echo "$r $1 $2"; }
chk / ""
chk /fakulteti ""
chk /f/etf ""
chk /f/etf/programiranje-1 ""
chk /f/matf ""
chk /api/health ""; cat /tmp/pk_body; echo
chk /sitemap.xml "(urls: $(curl -s $B/sitemap.xml | grep -c '<loc>'))"
chk /robots.txt ""
chk /f/etf/programiranje-1/opengraph-image ""
chk /nepostoji "(ожидается 404)"
echo "html cache-control: $(curl -sI $B/ | grep -i '^cache-control' | tr -d '\r')"
echo "static cache-control: $(curl -sI "$B$(curl -s $B/ | grep -o '/_next/static/[^"]*\.js' | head -1)" | grep -i '^cache-control' | tr -d '\r')"
echo "x-robots-tag: $(curl -sI $B/ | grep -i '^x-robots-tag' | tr -d '\r')"
curl -s "$B/" | grep -q "Svaki stari rok" && echo "главная: контент на месте" || fail "главная без контента"

step "Контейнеры"
docker compose -f deploy/docker-compose.yml ps --format "table {{.Service}}\t{{.State}}\t{{.Status}}"

step "Итог"
[ "$FAILED" = 0 ] && echo "OK: https://$DOMAIN" || echo "ЕСТЬ ОШИБКИ, см. выше"

# отчёт в git
exec 1>&3 2>&4
sleep 1
cd "$ROOT"
git config user.email >/dev/null || git config user.email "server@puskica"
git config user.name >/dev/null || git config user.name "Puskica Server"
git add reports/deploy-latest.txt
git commit -qm "deploy report $(date -u +%F_%H%M)" >/dev/null 2>&1
git pull -q --rebase >/dev/null 2>&1
git push -q >/dev/null 2>&1 && echo "Отчёт отправлен в git." || echo "Отчёт не удалось отправить в git."
[ "$FAILED" = 0 ] && echo "Готово: https://$DOMAIN" || echo "Есть ошибки, отчёт в git."
