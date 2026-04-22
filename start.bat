@echo off
echo.
echo 🚀 Starting Student Attendance Management System with Docker...
echo.

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop.
    echo 📥 Download from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo ✅ Docker is installed
echo.

REM Check for existing container
docker ps -a --format "table {{.Names}}" | findstr "attendance_db" >nul
if %ERRORLEVEL% EQU 0 (
    echo ℹ️  PostgreSQL container already exists
    echo.
    set /p rebuild="Do you want to rebuild? (y/n) "
    if /i "%rebuild%"=="y" (
        echo 🔄 Rebuilding and starting...
        docker compose down -v
        docker compose up --build
    ) else (
        echo 🚀 Starting existing containers...
        docker compose up
    )
) else (
    echo 📦 Creating new containers...
    docker compose up
)
