@echo off
echo Starting MindSphere...

start "MindSphere Backend" cmd /k "cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
start "MindSphere Frontend" cmd /k "cd frontend && npm run dev"

echo MindSphere is running!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:8080
