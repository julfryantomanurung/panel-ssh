#!/bin/bash
echo "Installing Dropbear SSH..."
apt install -y dropbear

# Config Port 10900
cat > /etc/default/dropbear <<EOF
NO_START=0
DROPBEAR_PORT=10900
DROPBEAR_EXTRA_ARGS=""
DROPBEAR_BANNER="SERVER SUDAH ON"
EOF

systemctl restart dropbear
