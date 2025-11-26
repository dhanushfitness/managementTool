#!/bin/bash

echo "======================================"
echo "  Stopping Gym Management Platform"
echo "======================================"
echo ""

echo "🛑 Stopping all services..."
docker-compose down

echo ""
echo "✅ All services stopped successfully!"
echo ""
echo "To start again, run: ./docker-start.sh"
echo "To remove all data, run: docker-compose down -v"
echo ""

