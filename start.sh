#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
DB_NAME="foodtruck"

echo "=========================================="
echo "  Food Truck AI Platform - Startup Script"
echo "=========================================="
echo ""

# Navigate to project root
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

# Load existing .env if it exists
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

# Set default DATABASE_URL if not provided
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "==> DATABASE_URL not set, using default..."
  DB_USER="${USER:-$(whoami)}"
  export DATABASE_URL="postgresql://${DB_USER}@localhost:5432/${DB_NAME}?schema=public"
fi
echo "DATABASE_URL: ${DATABASE_URL}"
echo ""

# Check if PostgreSQL is running
echo "==> Checking PostgreSQL status..."
if ! command -v psql &> /dev/null; then
  echo "WARNING: psql command not found. Assuming PostgreSQL is configured correctly."
else
  if ! psql -h localhost -c "SELECT 1;" postgres >/dev/null 2>&1 && \
     ! psql -c "SELECT 1;" postgres >/dev/null 2>&1; then
    echo ""
    echo "ERROR: Cannot connect to PostgreSQL server."
    echo ""
    echo "Please start PostgreSQL:"
    echo "  macOS:  brew services start postgresql"
    echo "  Linux:  sudo systemctl start postgresql"
    echo ""
    exit 1
  fi
  echo "PostgreSQL server is running."

  echo ""
  echo "==> Ensuring database '${DB_NAME}' exists..."
  if ! psql -h localhost -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}" && \
     ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
    echo "Creating database '${DB_NAME}'..."
    createdb "${DB_NAME}" 2>/dev/null || createdb -h localhost "${DB_NAME}" 2>/dev/null || {
      echo "Could not create database automatically."
      echo "Please create it manually: createdb ${DB_NAME}"
      exit 1
    }
    echo "Database created successfully!"
  else
    echo "Database '${DB_NAME}' already exists."
  fi
fi

# Create root .env if it doesn't exist
echo ""
echo "==> Checking root .env file..."
if [ ! -f "$PROJECT_ROOT/.env" ]; then
  echo "Creating root .env file..."
  cat > "$PROJECT_ROOT/.env" << EOF
# Database Configuration
DATABASE_URL="${DATABASE_URL}"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Server Configuration
PORT=${BACKEND_PORT}
FRONTEND_PORT=${FRONTEND_PORT}

# OpenRouter AI Configuration
OPENROUTER_API_KEY=""
OPENROUTER_MODEL="anthropic/claude-3-haiku"
EOF
  echo "Root .env file created."
else
  echo "Root .env file exists."
  # Update DATABASE_URL if needed
  if grep -q "^DATABASE_URL=" "$PROJECT_ROOT/.env"; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" "$PROJECT_ROOT/.env" 2>/dev/null || \
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" "$PROJECT_ROOT/.env"
  fi
fi

# Clean up processes on the backend port
echo ""
echo "==> Cleaning up processes on port ${BACKEND_PORT}..."
if lsof -ti tcp:"${BACKEND_PORT}" >/dev/null 2>&1; then
  echo "Found processes on port ${BACKEND_PORT}, killing them..."
  lsof -ti tcp:"${BACKEND_PORT}" | xargs kill -9 || true
  sleep 1
  echo "Processes on port ${BACKEND_PORT} have been terminated."
else
  echo "No processes found on port ${BACKEND_PORT}."
fi

# Clean up processes on the frontend port
echo ""
echo "==> Cleaning up processes on port ${FRONTEND_PORT}..."
if lsof -ti tcp:"${FRONTEND_PORT}" >/dev/null 2>&1; then
  echo "Found processes on port ${FRONTEND_PORT}, killing them..."
  lsof -ti tcp:"${FRONTEND_PORT}" | xargs kill -9 || true
  sleep 1
  echo "Processes on port ${FRONTEND_PORT} have been terminated."
else
  echo "No processes found on port ${FRONTEND_PORT}."
fi

# Install backend dependencies
echo ""
echo "==> Setting up backend..."
cd "$PROJECT_ROOT/backend"

if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
else
  echo "Backend dependencies already installed."
fi

# Ensure required packages are installed
echo "==> Checking for required backend packages..."
npm list socket.io >/dev/null 2>&1 || npm install socket.io
npm list node-cron >/dev/null 2>&1 || npm install node-cron

# Generate Prisma client (uses root .env via dotenv-cli or schema config)
echo ""
echo "==> Generating Prisma client..."
DOTENV_CONFIG_PATH="$PROJECT_ROOT/.env" npx prisma generate

# Run database migrations (auto-accept warnings)
echo ""
echo "==> Running Prisma migrations..."
DOTENV_CONFIG_PATH="$PROJECT_ROOT/.env" npx prisma db push --accept-data-loss || {
  echo "Migration failed. Trying to create initial schema..."
  DOTENV_CONFIG_PATH="$PROJECT_ROOT/.env" npx prisma db push --force-reset
}

# Check if database has been seeded
echo ""
echo "==> Checking if database needs seeding..."
USER_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' ' || echo "0")
if [ "${USER_COUNT}" = "0" ] || [ -z "${USER_COUNT}" ]; then
  echo "Database appears empty. Running seed..."
  npm run prisma:seed 2>/dev/null || node prisma/seed.js
else
  echo "Database already contains data (${USER_COUNT} users). Skipping seed."
fi

# Install frontend dependencies
echo ""
echo "==> Setting up frontend..."
cd "$PROJECT_ROOT/frontend"

if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
else
  echo "Frontend dependencies already installed."
fi

# Ensure required packages are installed
echo "==> Checking for required frontend packages..."
npm list socket.io-client >/dev/null 2>&1 || npm install socket.io-client --legacy-peer-deps
npm list leaflet >/dev/null 2>&1 || npm install leaflet react-leaflet --legacy-peer-deps

# Function to cleanup background processes on exit
cleanup() {
  echo ""
  echo "Shutting down servers..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend server
echo ""
echo "=========================================="
echo "  Starting servers..."
echo "=========================================="
echo ""

echo "Starting backend server on port ${BACKEND_PORT}..."
cd "$PROJECT_ROOT/backend"
npm start &
BACKEND_PID=$!
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
  echo "ERROR: Backend server failed to start."
  exit 1
fi
echo "Backend server running on http://localhost:${BACKEND_PORT}"

# Start frontend server
echo ""
echo "Starting frontend server on port ${FRONTEND_PORT}..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
sleep 3

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
  echo "ERROR: Frontend server failed to start."
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi
echo "Frontend server running on http://localhost:${FRONTEND_PORT}"

echo ""
echo "=========================================="
echo "  Food Truck AI Platform is running!"
echo "=========================================="
echo ""
echo "Access the application at: http://localhost:${FRONTEND_PORT}"
echo "Backend API: http://localhost:${BACKEND_PORT}/api"
echo ""
echo "Demo Account:"
echo "  Email: demo@foodtruck.com"
echo "  Password: password123"
echo ""
echo "Press Ctrl+C to stop all servers."
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
