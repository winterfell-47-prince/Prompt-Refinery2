#!/bin/bash

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Prompt Refinery Backend Setup${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing npm dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}\n"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}\n"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${BLUE}📝 Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${BLUE}   Please update with your database URL and API keys${NC}\n"
else
    echo -e "${GREEN}✓ .env file exists${NC}\n"
fi

# Build TypeScript
echo -e "${BLUE}🔨 Building TypeScript...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}\n"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Run migrations
echo -e "${BLUE}🗄️  Running database migrations...${NC}"
npm run db:migrate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations completed${NC}\n"
else
    echo -e "${RED}❌ Migrations failed - check DATABASE_URL in .env${NC}"
    exit 1
fi

# Optional: Seed database
read -p "Do you want to seed test data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🌱 Seeding test data...${NC}"
    npm run db:seed
    echo -e "${GREEN}✓ Test data seeded${NC}\n"
fi

echo -e "${GREEN}✅ Setup complete!${NC}\n"
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Start development: npm run dev"
echo "  2. API will be available at http://localhost:5000"
echo "  3. Health check: curl http://localhost:5000/health"
echo ""
echo -e "${BLUE}Test the API:${NC}"
echo "  curl -X POST http://localhost:5000/api/auth/register \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"test@example.com\",\"password\":\"password123\",\"fullName\":\"Test User\",\"organizationName\":\"Test Org\",\"organizationSlug\":\"test-org\"}'"
