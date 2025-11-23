#!/bin/bash
DOMAIN=$(cat /root/domain)
echo "Configuring Nginx for $DOMAIN..."
apt install -y nginx

# SSL Dummy
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout /etc/ssl/private/nginx-selfsigned.key -out /etc/ssl/certs/nginx-selfsigned.crt -subj "/C=ID/ST=Jkt/L=Jkt/O=Tunnel/CN=$DOMAIN"

# Config Nginx
cat > /etc/nginx/sites-available/tunnel <<EOF
server {
    listen 80 default_server;
    listen 443 ssl http2 default_server;
    server_name _; 

    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
    
    client_header_buffer_size 32k;
    large_client_header_buffers 4 32k;
    proxy_read_timeout 86400;
    keepalive_timeout 86400;
    
    # Log Off (Hemat I/O)
    access_log off;
    error_log /dev/null crit;

    # XRAY ROUTES
    location /vless { proxy_pass http://127.0.0.1:10001; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host \$host; }
    location /vmess { proxy_pass http://127.0.0.1:10002; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host \$host; }
    location /trojan { proxy_pass http://127.0.0.1:10003; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host \$host; }

    # SSH CATCH-ALL
    location / {
        error_page 418 = @ws_proxy;
        set \$is_ws 0;
        if (\$http_upgrade ~* "websocket") { set \$is_ws 1; }
        if (\$http_connection ~* "upgrade") { set \$is_ws 1; }
        if (\$request_method ~* "(CF-RAY|GET-RAY|BMOVE|X-RAY|PROPFIND)") { set \$is_ws 1; }
        if (\$is_ws = 1) { return 418; }
        root /var/www/html; index index.html; try_files \$uri \$uri/ =404;
    }
    location @ws_proxy { proxy_pass http://127.0.0.1:2082; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host \$host; }
}
EOF

echo "<h1>Maintenance</h1>" > /var/www/html/index.html
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/tunnel /etc/nginx/sites-enabled/
systemctl restart nginx
