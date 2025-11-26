#!/bin/bash

echo "======================================"
echo "  Gym Management Platform - Docker"
echo "======================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if .env exists in backend
if [ ! -f backend/.env ]; then
    echo "⚠️  Warning: backend/.env file not found!"
    echo "Please create backend/.env with your configuration."
    echo ""
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🔨 Building Docker images (this may take 5-10 minutes on first run)..."
docker-compose build

echo ""
echo "🚀 Starting all services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "======================================"
echo "  Services are now running!"
echo "======================================"
echo ""
echo "📱 Frontend:  http://localhost:8080"
echo "🔧 Backend:   http://localhost:5000"
echo "🗄️  MongoDB:   localhost:27017"
echo ""
echo "Useful commands:"
echo "  View logs:        docker-compose logs -f"
echo "  Stop services:    docker-compose down"
echo "  Restart services: docker-compose restart"
echo ""
echo "For more help, see DOCKER_SETUP_GUIDE.md"
echo ""

