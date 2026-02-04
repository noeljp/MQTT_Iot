#!/bin/bash

# Start backend
cd backend
python3 run.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 5

# Start frontend
cd frontend
PORT=3000 npm start &
FRONTEND_PID=$!
cd ..

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Servers started. Backend: http://localhost:5000, Frontend: http://localhost:3000"

# Keep script running
wait
