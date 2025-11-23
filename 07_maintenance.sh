#!/bin/bash
echo "Setting up Auto-Maintenance..."

cat > /usr/local/bin/clearcache <<EOF
#!/bin/bash
sync; echo 3 > /proc/sys/vm/drop_caches
swapoff -a && swapon -a
EOF
chmod +x /usr/local/bin/clearcache

cat > /var/spool/cron/crontabs/root <<EOF
0 1 * * * /sbin/reboot
0 4 * * * /usr/local/bin/clearcache
0 16 * * * /usr/local/bin/clearcache
EOF
chmod 600 /var/spool/cron/crontabs/root
service cron restart
