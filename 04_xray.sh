
#!/bin/bash
echo "Installing Xray Core..."
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install

# Config Xray (Low Memory Policy)
cat > /usr/local/etc/xray/config.json <<EOF
{
  "policy": { "levels": { "0": { "handshake": 4, "connIdle": 300, "uplinkOnly": 2, "downlinkOnly": 5, "bufferSize": 4 } } },
  "log": { "access": "none", "error": "none", "loglevel": "error" },
  "inbounds": [
    { "port": 10001, "listen": "127.0.0.1", "protocol": "vless", "settings": { "clients": [], "decryption": "none" }, "streamSettings": { "network": "ws", "wsSettings": { "path": "/vless" } } },
    { "port": 10002, "listen": "127.0.0.1", "protocol": "vmess", "settings": { "clients": [] }, "streamSettings": { "network": "ws", "wsSettings": { "path": "/vmess" } } },
    { "port": 10003, "listen": "127.0.0.1", "protocol": "trojan", "settings": { "clients": [] }, "streamSettings": { "network": "ws", "wsSettings": { "path": "/trojan" } } }
  ],
  "outbounds": [ { "protocol": "freedom" }, { "protocol": "blackhole", "tag": "blocked" } ]
}
EOF
systemctl restart xray
