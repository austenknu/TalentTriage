#!/bin/bash
# TalentTriage Development Setup Script
# This script helps set up the development environment for TalentTriage

# Print colored output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== TalentTriage Development Setup ===${NC}"
echo "This script will help you set up your development environment."

# Check if Python is installed
echo -e "\n${YELLOW}Checking Python installation...${NC}"
if command -v python3 &>/dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓ Python is installed: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}✗ Python 3 is not installed. Please install Python 3.9 or higher.${NC}"
    exit 1
fi

# Check if Node.js is installed
echo -e "\n${YELLOW}Checking Node.js installation...${NC}"
if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js is installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js is not installed. Please install Node.js 16 or higher.${NC}"
    exit 1
fi

# Check if Redis is installed
echo -e "\n${YELLOW}Checking Redis installation...${NC}"
if command -v redis-cli &>/dev/null; then
    REDIS_VERSION=$(redis-cli --version)
    echo -e "${GREEN}✓ Redis is installed: $REDIS_VERSION${NC}"
else
    echo -e "${RED}✗ Redis is not installed. Please install Redis for background job processing.${NC}"
    echo -e "${YELLOW}On macOS: brew install redis${NC}"
    echo -e "${YELLOW}On Ubuntu: sudo apt install redis-server${NC}"
    exit 1
fi

# Create Python virtual environment
echo -e "\n${YELLOW}Setting up Python virtual environment...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo -e "\n${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate
echo -e "${GREEN}✓ Virtual environment activated${NC}"

# Install Python dependencies
echo -e "\n${YELLOW}Installing Python dependencies...${NC}"
pip install -r requirements.txt
echo -e "${GREEN}✓ Python dependencies installed${NC}"

# Install spaCy model if needed
echo -e "\n${YELLOW}Checking spaCy model...${NC}"
if python -c "import spacy; spacy.load('en_core_web_sm')" &>/dev/null; then
    echo -e "${GREEN}✓ spaCy model already installed${NC}"
else
    echo -e "${YELLOW}Installing spaCy model...${NC}"
    python -m spacy download en_core_web_sm
    echo -e "${GREEN}✓ spaCy model installed${NC}"
fi

# Install frontend dependencies
echo -e "\n${YELLOW}Installing frontend dependencies...${NC}"
cd frontend/nextjs_dashboard
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Check for environment files
echo -e "\n${YELLOW}Checking environment files...${NC}"
cd ../../services
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file from example${NC}"
        echo -e "${YELLOW}⚠ Please edit the .env file with your Supabase credentials${NC}"
    else
        echo -e "${RED}✗ .env.example file not found${NC}"
    fi
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

cd ../frontend/nextjs_dashboard
if [ ! -f ".env.local" ]; then
    echo -e "NEXT_PUBLIC_SUPABASE_URL=your-supabase-url\nNEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key" > .env.local
    echo -e "${GREEN}✓ Created .env.local file${NC}"
    echo -e "${YELLOW}⚠ Please edit the .env.local file with your Supabase credentials${NC}"
else
    echo -e "${GREEN}✓ .env.local file already exists${NC}"
fi

# Return to root directory
cd ../../

echo -e "\n${GREEN}=== Setup Complete ===${NC}"
echo -e "To start the services:"
echo -e "1. Start Redis: ${YELLOW}redis-server${NC}"
echo -e "2. Start the ingest service: ${YELLOW}cd services/ingest_service && uvicorn main:app --reload --port 8000${NC}"
echo -e "3. Start the worker manager: ${YELLOW}cd services && python worker_manager.py${NC}"
echo -e "4. Start the frontend: ${YELLOW}cd frontend/nextjs_dashboard && npm run dev${NC}"
echo -e "\nVisit ${GREEN}http://localhost:3000${NC} to access the dashboard"
