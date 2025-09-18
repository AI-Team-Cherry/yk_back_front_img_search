#!/bin/bash

# Start the platform script
echo "Starting NLP Analytics Platform..."

# Function to kill both processes on exit
cleanup() {
    echo -e "\nShutting down..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set up trap to catch CTRL+C
trap cleanup SIGINT

# Start backend
echo "Starting backend server..."
cd "$(dirname "$0")"
source venv/bin/activate && python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend server..."
cd frontend
npm start &
FRONTEND_PID=$!

echo -e "\nPlatform is running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo -e "\nPress CTRL+C to stop all services"

# Keep script running
wait