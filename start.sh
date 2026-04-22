#!/bin/bash

echo "🚀 Starting Student Attendance Management System with Docker..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop."
    echo "📥 Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Docker is installed and running"
echo ""

# Check for existing container
if docker ps -a --format '{{.Names}}' | grep -q "attendance_db"; then
    echo "ℹ️  PostgreSQL container already exists"
    echo ""
    read -p "Do you want to rebuild? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Rebuilding and starting..."
        docker compose down -v
        docker compose up --build
    else
        echo "🚀 Starting existing containers..."
        docker compose up
    fi
else
    echo "📦 Creating new containers..."
    docker compose up
fi
