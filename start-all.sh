#!/bin/bash

echo "========================================="
echo "🚀 Starting Course Platform"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if required commands exist
echo "🔍 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Kill any existing processes on ports 3000 and 4000
echo "🧹 Cleaning up existing processes..."
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:4000 2>/dev/null | xargs kill -9 2>/dev/null || true
echo -e "${GREEN}✓ Ports cleaned${NC}"
echo ""

# Start Docker services
echo "🐳 Starting Docker services..."
npm run docker:up

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker services started${NC}"
else
    echo -e "${RED}❌ Failed to start Docker services${NC}"
    echo "Try running manually: docker compose up -d"
    exit 1
fi

# Wait for PostgreSQL to be ready
echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if PGPASSWORD=postgres psql -h localhost -U postgres -d course_platform -c "SELECT 1" &>/dev/null; then
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ PostgreSQL failed to start${NC}"
        exit 1
    fi
    sleep 1
done

echo ""
echo "========================================="
echo "✅ All services ready!"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Start API (Terminal 2):"
echo "   ${YELLOW}npm run dev:api${NC}"
echo ""
echo "2. Start Frontend (Terminal 3):"
echo "   ${YELLOW}npm run dev:web${NC}"
echo ""
echo "3. Run tests (Terminal 4):"
echo "   ${YELLOW}./test-auth.sh${NC}"
echo ""
echo "Services:"
echo "- Frontend: http://localhost:3000"
echo "- API: http://localhost:4000"
echo "- DB Admin: http://localhost:5050"
echo "- Redis Admin: http://localhost:8081"
echo ""
echo "Press Ctrl+C to stop Docker services"
echo ""

# Keep script running to show logs
npm run docker:logs
