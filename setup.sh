#!/bin/bash

# ShopiFow Setup Script
# Run: chmod +x setup.sh && ./setup.sh

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
  echo ""
  echo -e "${BOLD}${BLUE}╔══════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${BLUE}║        ShopiFow — Setup Script       ║${NC}"
  echo -e "${BOLD}${BLUE}║   AI E-Commerce Automation Demo      ║${NC}"
  echo -e "${BOLD}${BLUE}╚══════════════════════════════════════╝${NC}"
  echo ""
}

check_deps() {
  echo -e "${BOLD}[1/5] Checking dependencies...${NC}"

  if ! command -v node &>/dev/null; then
    echo -e "${RED}✗ Node.js not found. Install from https://nodejs.org (>= 18)${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

  if ! command -v npm &>/dev/null; then
    echo -e "${RED}✗ npm not found.${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ npm $(npm -v)${NC}"

  if ! command -v docker &>/dev/null; then
    echo -e "${RED}✗ Docker not found. Install from https://www.docker.com${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Docker $(docker --version | cut -d' ' -f3 | tr -d ',')${NC}"

  if ! docker info &>/dev/null; then
    echo -e "${RED}✗ Docker daemon is not running. Please start Docker Desktop.${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Docker daemon running${NC}"
}

setup_env() {
  echo ""
  echo -e "${BOLD}[2/5] Setting up environment...${NC}"

  if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠  Created .env from .env.example${NC}"
    echo -e "${YELLOW}   Please fill in your credentials:${NC}"
    echo ""
    echo -e "   ${BOLD}OPENROUTER_API_KEY${NC}    → https://openrouter.ai/keys"
    echo -e "   ${BOLD}SHOPIFY_STORE_DOMAIN${NC}  → your-store.myshopify.com"
    echo -e "   ${BOLD}SHOPIFY_ACCESS_TOKEN${NC}  → Shopify Admin → Settings → Apps → Custom App"
    echo ""
    read -p "   Press ENTER after editing .env to continue (or Ctrl+C to abort)..."
  else
    echo -e "${GREEN}✓ .env already exists${NC}"
  fi

  # Copy .env to frontend
  if [ ! -f "apps/frontend/.env.local" ]; then
    cp .env apps/frontend/.env.local
    echo -e "${GREEN}✓ Copied .env to apps/frontend/.env.local${NC}"
  fi
}

install_deps() {
  echo ""
  echo -e "${BOLD}[3/5] Installing Node.js dependencies...${NC}"

  cd apps/frontend
  if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
  else
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
  fi
  cd ../..
}

start_docker() {
  echo ""
  echo -e "${BOLD}[4/5] Starting Docker services (n8n + PostgreSQL)...${NC}"

  # Stop existing containers first to avoid conflicts
  docker compose down 2>/dev/null || true

  docker compose up -d --build

  echo ""
  echo -e "   Waiting for services to be healthy..."
  local retries=30
  while [ $retries -gt 0 ]; do
    if docker compose ps | grep -q "healthy"; then
      break
    fi
    sleep 2
    retries=$((retries - 1))
    printf "."
  done
  echo ""

  # Wait specifically for n8n
  echo -e "   Waiting for n8n to be ready..."
  retries=30
  while [ $retries -gt 0 ]; do
    if curl -s http://localhost:5678/healthz &>/dev/null; then
      break
    fi
    sleep 2
    retries=$((retries - 1))
    printf "."
  done
  echo ""

  echo -e "${GREEN}✓ Docker services running${NC}"
  echo -e "   n8n:       http://localhost:5678"
  echo -e "   PostgreSQL: localhost:5433"
}

print_summary() {
  echo ""
  echo -e "${BOLD}[5/5] Setup complete!${NC}"
  echo ""
  echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${GREEN}║           Everything is ready!           ║${NC}"
  echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${BOLD}Start the app:${NC}"
  echo -e "  ${BLUE}cd apps/frontend && npm run dev${NC}"
  echo ""
  echo -e "${BOLD}Access:${NC}"
  echo -e "  Frontend:   ${BLUE}http://localhost:3000${NC}"
  echo -e "  n8n UI:     ${BLUE}http://localhost:5678${NC}"
  echo ""
  echo -e "${BOLD}Import n8n workflows:${NC}"
  echo -e "  1. Open http://localhost:5678"
  echo -e "  2. Go to Workflows → Import"
  echo -e "  3. Import files from ${BLUE}n8n/workflows/${NC}"
  echo ""
  echo -e "${BOLD}Stop Docker services:${NC}"
  echo -e "  ${BLUE}docker compose down${NC}"
  echo ""
}

# Main
print_header
check_deps
setup_env
install_deps
start_docker
print_summary
