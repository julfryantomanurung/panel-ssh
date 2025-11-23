#!/bin/bash
echo "Installing Python Async Bridge..."

cat > /usr/local/bin/ws-ssh.py << 'EOF'
#!/usr/bin/env python3
import asyncio, socket, logging
LISTEN_ADDR, LISTEN_PORT = '127.0.0.1', 2082
SSH_ADDR, SSH_PORT = '127.0.0.1', 10900
CHUNK_SIZE = 4096
logging.basicConfig(level=logging.ERROR)

async def pipe(reader, writer):
    try:
        while not reader.at_eof():
            data = await reader.read(CHUNK_SIZE)
            if not data: break
            writer.write(data)
            await writer.drain()
    except: pass
    finally: writer.close()

async def handle_client(client_reader, client_writer):
    try:
        # Telan Payload (Bypass Injeksi)
        try: await asyncio.wait_for(client_reader.read(1024), timeout=3.0)
        except: client_writer.close(); return

        try: remote_reader, remote_writer = await asyncio.open_connection(SSH_ADDR, SSH_PORT)
        except: client_writer.close(); return

        # Balas 101 OK
        client_writer.write(b"HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n")
        await client_writer.drain()

        await asyncio.gather(pipe(client_reader, remote_writer), pipe(remote_reader, client_writer), return_exceptions=True)
    except: pass
    finally: client_writer.close()

async def main():
    server = await asyncio.start_server(handle_client, LISTEN_ADDR, LISTEN_PORT, reuse_address=True)
    async with server: await server.serve_forever()

if __name__ == '__main__':
    try: asyncio.run(main())
    except: pass
EOF

chmod +x /usr/local/bin/ws-ssh.py
cat > /etc/systemd/system/ws-ssh.service <<EOF
[Unit]
Description=Python Async Bridge
After=network.target
[Service]
ExecStart=/usr/bin/python3 /usr/local/bin/ws-ssh.py
Restart=always
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable ws-ssh
systemctl restart ws-ssh
