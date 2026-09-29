@echo off
title AURA GRN - Enterprise Goods Received Note SaaS
cd /d "%~dp0"

echo =====================================================================
echo           AURA GRN - Enterprise Logistics ^& Quality Control
echo                   Powered by Next.js ^& Supabase
echo =====================================================================
echo.

:: 1. Verify Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not detected on your system.
    echo Please install Node.js (LTS version) from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Ensure dependencies are installed
if not exist "node_modules\" (
    echo [INFO] Installing required dependencies (first-time setup)...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed successfully.
    echo.
)

:: 3. Launch default browser after server initializes (2 seconds)
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

echo [INFO] Launching Next.js development server on http://localhost:3000 ...
echo [INFO] Press Ctrl+C in this window anytime to stop the server.
echo.

:: 4. Start Next.js Development Server
call npm.cmd run dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server encountered an unexpected issue (Code: %errorlevel%).
    pause
)
