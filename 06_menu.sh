#!/bin/bash
echo "Installing Menu Manager..."

cat > /usr/local/sbin/menu << 'EOF'
#!/bin/bash
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; NC='\033[0m'
DOMAIN=$(grep "server_name" /etc/nginx/sites-available/tunnel | head -n 1 | awk '{print $2}' | tr -d ';')
CONFIG_XRAY="/usr/local/etc/xray/config.json"

function check() { if systemctl is-active --quiet "$1"; then echo -e "${GREEN}ON${NC}"; else echo -e "${RED}OFF${NC}"; fi; }

function add_xray() {
    local proto=$1; local user=$2; local uuid=$(uuidgen)
    cp $CONFIG_XRAY /usr/local/etc/xray/config.json.bak
    if [[ "$proto" == "vmess" ]]; then jq --arg u "$uuid" --arg n "$user" '.inbounds[1].settings.clients += [{"id": $u, "alterId": 0, "email": $n}]' $CONFIG_XRAY > /tmp/xray.json
    elif [[ "$proto" == "vless" ]]; then jq --arg u "$uuid" --arg n "$user" '.inbounds[0].settings.clients += [{"id": $u, "email": $n}]' $CONFIG_XRAY > /tmp/xray.json
    elif [[ "$proto" == "trojan" ]]; then jq --arg p "$user" --arg n "$user" '.inbounds[2].settings.clients += [{"password": $p, "email": $n}]' $CONFIG_XRAY > /tmp/xray.json; fi
    mv /tmp/xray.json $CONFIG_XRAY; systemctl restart xray
    clear; echo -e "${GREEN}AKUN $proto DIBUAT${NC}"; echo "User: $user"; echo "UUID/Pass: $uuid"; echo "Domain: $DOMAIN"; echo ""; read -p "Enter..."
}

clear
echo -e "${BLUE}=== VPS MANAGER ===${NC}"
echo -e "Nginx: $(check nginx) | Xray: $(check xray) | Py: $(check ws-ssh) | SSH: $(check dropbear)"
echo -e "1. Add SSH User"
echo -e "2. Add VLESS User"
echo -e "3. Add VMess User"
echo -e "4. Add Trojan User"
echo -e "5. Restart All Services"
echo -e "x. Exit"
read -p "Pilih: " opt
case $opt in
1) read -p "User: " u; read -p "Pass: " p; useradd -m -s /bin/bash $u; echo "$u:$p" | chpasswd; menu ;;
2) read -p "User: " u; add_xray "vless" "$u"; menu ;;
3) read -p "User: " u; add_xray "vmess" "$u"; menu ;;
4) read -p "User: " u; add_xray "trojan" "$u"; menu ;;
5) systemctl restart nginx xray ws-ssh dropbear; echo "Done"; sleep 1; menu ;;
x) exit ;;
*) menu ;;
esac
EOF

chmod +x /usr/local/sbin/menu
