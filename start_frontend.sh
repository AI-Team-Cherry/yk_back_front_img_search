#!/bin/bash

# Start frontend server only
echo "Starting frontend server..."
cd "$(dirname "$0")/frontend"
npm start