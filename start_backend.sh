#!/bin/bash

# Start backend server only
echo "Starting backend server..."
cd "$(dirname "$0")"
source venv/bin/activate && python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000