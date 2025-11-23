#!/bin/bash

echo "=========================================="
echo "  VPN Panel API - Setup Script"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# Create .env file if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    
    # Generate random API key
    API_KEY=$(openssl rand -hex 32)
    sed -i "s/your-secret-api-key-here/${API_KEY}/" .env
    
    # Get domain
    read -p "Enter your domain (e.g., vpn.example.com): " DOMAIN
    if [ ! -z "$DOMAIN" ]; then
        sed -i "s/yourdomain.com/${DOMAIN}/" .env
    fi
    
    echo "✅ .env file created with random API key"
    echo "⚠️  Please update Tripay and Telegram credentials in .env"
else
    echo "ℹ️  .env file already exists, skipping..."
fi

echo ""

# Create data directory
mkdir -p data

# Initialize database
echo "🗄️  Initializing database..."
npm run migrate

if [ $? -ne 0 ]; then
    echo "❌ Failed to initialize database"
    exit 1
fi

echo "✅ Database initialized successfully"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    read -p "Install PM2 for process management? (y/n): " INSTALL_PM2
    if [ "$INSTALL_PM2" = "y" ] || [ "$INSTALL_PM2" = "Y" ]; then
        npm install -g pm2
        echo "✅ PM2 installed"
    fi
fi

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env file and add your credentials:"
echo "   - Tripay API keys"
echo "   - Telegram bot token"
echo ""
echo "2. Start the server:"
echo "   Development: npm run dev"
echo "   Production:  npm start"
echo "   With PM2:    pm2 start src/server.js --name vpn-panel-api"
echo ""
echo "3. Test the API:"
echo "   curl http://localhost:3000/health"
echo ""
echo "4. Check logs:"
echo "   PM2: pm2 logs vpn-panel-api"
echo ""
echo "Your API Key: $(grep API_KEY .env | cut -d '=' -f2)"
echo ""
echo "Documentation: README.md"
echo "API Examples: API_EXAMPLES.md"
echo ""
