@echo off
echo ========================================
echo Starting MindSphere...
echo ========================================
echo.

echo [1/2] Starting Backend on port 8000...
start "MindSphere Backend" cmd /k "cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak >nul

echo Starting Frontend on port 8080...
start "MindSphere Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo MindSphere is running!
echo ========================================
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:8080
echo API Docs: http://localhost:8000/docs
echo ========================================
