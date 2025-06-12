#!/bin/bash
# TalentTriage Service Starter Script
# This script helps start all the required services for TalentTriage

# Print colored output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== TalentTriage Service Starter ===${NC}"
echo "This script will start all the required services for TalentTriage."

# Check if Redis is running
echo -e "\n${YELLOW}Checking if Redis is running...${NC}"
if redis-cli ping &>/dev/null; then
    echo -e "${GREEN}✓ Redis is already running${NC}"
else
    echo -e "${YELLOW}Starting Redis server...${NC}"
    # Start Redis in the background
    redis-server &
    REDIS_PID=$!
    sleep 2
    if redis-cli ping &>/dev/null; then
        echo -e "${GREEN}✓ Redis server started successfully${NC}"
    else
        echo -e "${RED}✗ Failed to start Redis server${NC}"
        exit 1
    fi
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo -e "\n${YELLOW}Activating virtual environment...${NC}"
    source venv/bin/activate
    echo -e "${GREEN}✓ Virtual environment activated${NC}"
else
    echo -e "\n${YELLOW}⚠ Virtual environment not found. Run setup_dev.sh first.${NC}"
    exit 1
fi

# Start the ingest service
echo -e "\n${YELLOW}Starting ingest service...${NC}"
cd services/ingest_service
# Start in a new terminal window if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e 'tell app "Terminal" to do script "cd '$PWD' && source ../../venv/bin/activate && uvicorn main:app --reload --port 8000"'
    echo -e "${GREEN}✓ Ingest service started in a new terminal window${NC}"
else
    # For non-macOS, start in the background
    uvicorn main:app --reload --port 8000 > ../../logs/ingest_service.log 2>&1 &
    INGEST_PID=$!
    echo -e "${GREEN}✓ Ingest service started with PID $INGEST_PID${NC}"
    echo -e "${YELLOW}Logs available at logs/ingest_service.log${NC}"
fi

# Start the worker manager
echo -e "\n${YELLOW}Starting worker manager...${NC}"
cd ..
# Create logs directory if it doesn't exist
mkdir -p ../logs

# Start in a new terminal window if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e 'tell app "Terminal" to do script "cd '$PWD' && source ../venv/bin/activate && python worker_manager.py"'
    echo -e "${GREEN}✓ Worker manager started in a new terminal window${NC}"
else
    # For non-macOS, start in the background
    python worker_manager.py > ../logs/worker_manager.log 2>&1 &
    WORKER_PID=$!
    echo -e "${GREEN}✓ Worker manager started with PID $WORKER_PID${NC}"
    echo -e "${YELLOW}Logs available at logs/worker_manager.log${NC}"
fi

# Start the frontend
echo -e "\n${YELLOW}Starting Next.js frontend...${NC}"
cd ../frontend/nextjs_dashboard

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
fi

# Start in a new terminal window if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e 'tell app "Terminal" to do script "cd '$PWD' && npm run dev"'
    echo -e "${GREEN}✓ Next.js frontend started in a new terminal window${NC}"
else
    # For non-macOS, start in the background
    npm run dev > ../../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo -e "${GREEN}✓ Next.js frontend started with PID $FRONTEND_PID${NC}"
    echo -e "${YELLOW}Logs available at logs/frontend.log${NC}"
fi

# Return to root directory
cd ../../

echo -e "\n${GREEN}=== All Services Started ===${NC}"
echo -e "Services:"
echo -e "1. Redis: ${GREEN}Running${NC}"
echo -e "2. Ingest Service: ${GREEN}http://localhost:8000${NC}"
echo -e "3. Worker Manager: ${GREEN}Running${NC}"
echo -e "4. Next.js Frontend: ${GREEN}http://localhost:3000${NC}"

echo -e "\n${YELLOW}To stop all services:${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "Close the terminal windows or use Ctrl+C in each window"
else
    echo -e "Run: ${YELLOW}kill $REDIS_PID $INGEST_PID $WORKER_PID $FRONTEND_PID${NC}"
fi

# Make the script executable
chmod +x "$0"
