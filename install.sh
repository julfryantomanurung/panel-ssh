#!/bin/bash

# --- 1. CEK & HAPUS APACHE2 (PENTING) ---
# Dilakukan di awal agar tidak bentrok dengan Nginx nanti
echo "Checking for conflicting web servers..."

if [ -d /etc/apache2 ] || [ -f /etc/init.d/apache2 ] || command -v apache2 &> /dev/null; then
    echo "====================================================="
    echo "       PERINGATAN: APACHE2 WEB SERVER TERDETEKSI     "
    echo "====================================================="
    echo "Sedang membersihkan Apache2 agar port 80/443 kosong..."
    
    # Hentikan Service
    service apache2 stop 2>/dev/null
    systemctl stop apache2 2>/dev/null
    systemctl disable apache2 2>/dev/null
    
    # Hapus Total Paket
    apt purge apache2 apache2-* apache2-utils apache2-bin apache2-data -y
    
    # Bersihkan Sisa Dependensi
    apt autoremove -y
    
    # Hapus Config Tersisa
    rm -rf /etc/apache2
    rm -rf /var/www/html/index.html
    
    echo "Apache2 berhasil dihapus total."
    echo "====================================================="
    sleep 2
fi

# --- 2. UPDATE SYSTEM ---
echo "Updating System & Tweaking OpenVZ Limits..."
apt update && apt upgrade -y
apt install -y curl socat jq net-tools uuid-runtime unzip python3 cron

timedatectl set-timezone Asia/Jakarta

# Optimasi Limit OpenVZ (Anti Broken Pipe)
cat > /etc/security/limits.conf <<EOF
root hard nofile 512000
root soft nofile 512000
* hard nofile 512000
* soft nofile 512000
EOF

# Tuning Kernel (Simpel)
cat > /etc/sysctl.conf <<EOF
fs.file-max = 1000000
net.core.netdev_max_backlog = 250000
EOF
sysctl -p
