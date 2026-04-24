#!/bin/bash

# Fix stream.conf
sed -i 's/default              xray;/193.53.127.116.nip.io farm_ssl;\n    default              xray;/g' /etc/nginx/stream-enabled/stream.conf

cat << 'EOF' >> /etc/nginx/stream-enabled/stream.conf

upstream farm_ssl {
    server 127.0.0.1:6443;
}
EOF

# Fix farm config
sed -i 's/listen 443 ssl;/listen 6443 ssl http2 proxy_protocol;/g' /etc/nginx/sites-enabled/farm
sed -i '/listen 6443/a \    set_real_ip_from 127.0.0.1;\n    real_ip_header proxy_protocol;' /etc/nginx/sites-enabled/farm

nginx -t && systemctl restart nginx
