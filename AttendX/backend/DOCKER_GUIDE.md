# Docker Setup Guide

This project is now fully containerized with Docker and Docker Compose.

## Prerequisites

- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop))
- Docker daemon running

## Quick Start

```bash
# Navigate to project directory
cd student-attendance-system

# Start all services
docker compose up

# In another terminal, verify containers are running
docker ps
```

The application will be available at `http://localhost:5000`

## Services

### PostgreSQL Database
- **Container Name**: `attendance_db`
- **Host**: `localhost` (from host machine)
- **Port**: `5432`
- **Database**: `attendance_db`
- **User**: `postgres`
- **Password**: `admin`
- **Volume**: `postgres_data` (persists data)

### Node.js Application
- **Container Name**: `attendance_app`
- **Host**: `localhost` (from host machine)
- **Port**: `5000`
- **Auto-reload**: Enabled (uses nodemon with `npm run dev`)
- **Volume**: Current directory mounted to `/app`

## Common Commands

### Start Services
```bash
docker compose up
```

### Start in Background
```bash
docker compose up -d
```

### View Logs
```bash
docker compose logs -f app          # App logs
docker compose logs -f db           # Database logs
docker compose logs -f              # All logs
```

### Stop Services
```bash
docker compose down
```

### Stop and Remove Data
```bash
docker compose down -v              # Removes volumes too
```

### Restart Services
```bash
docker compose restart
```

### Access Database
```bash
docker exec -it attendance_db psql -U postgres -d attendance_db
```

### Access App Container
```bash
docker exec -it attendance_app bash
```

### Rebuild Images
```bash
docker compose build
```

### Force Rebuild and Start
```bash
docker compose up --build
```

## Environment Variables

All environment variables are configured in `docker-compose.yml`. To change them:

1. Edit `docker-compose.yml` under `services.app.environment`
2. Or edit `.env` file and rebuild:
   ```bash
   docker compose up --build
   ```

Current defaults:
- `NODE_ENV`: development
- `PORT`: 5000
- `DB_HOST`: db (Docker service name)
- `DB_USER`: postgres
- `DB_PASSWORD`: admin
- `DB_NAME`: attendance_db

## Volumes

### Data Persistence
- PostgreSQL data is stored in `postgres_data` volume
- Data persists even after `docker compose down`
- Only removed with `docker compose down -v`

### Code Synchronization
- Current directory mounted to `/app` inside container
- Changes to source code auto-reload (nodemon enabled)
- `node_modules` isolated in container

### Upload/Export Directories
- `./uploads` directory mounted for file uploads
- `./exports` directory mounted for exported files

## Testing the API

Once containers are running:

```bash
# Health check
curl http://localhost:5000/api/health

# Upload Excel file
curl -X POST -F "file=@attendance.xlsx" http://localhost:5000/api/attendance/upload

# Get statistics
curl http://localhost:5000/api/attendance/stats

# Search by email
curl "http://localhost:5000/api/attendance/search?email=john@gmail.com"
```

## Troubleshooting

### Port Already in Use
If port 5000 or 5432 is already in use:

```bash
# Change ports in docker-compose.yml
# Find the "ports:" section and modify

services:
  app:
    ports:
      - "5001:5000"  # Change left number to 5001
  
  db:
    ports:
      - "5433:5432"  # Change left number to 5433
```

Then rebuild:
```bash
docker compose up --build
```

### Database Connection Error
Check if PostgreSQL service is healthy:

```bash
docker compose ps          # Check status
docker compose logs db     # View database logs
```

Wait for "database system is ready to accept connections" message.

### Container Won't Start
```bash
docker compose logs app    # Check app logs
docker compose restart     # Try restarting
```

### Clean Up Everything
```bash
docker compose down -v     # Stop and remove all
docker system prune        # Remove unused images/volumes
```

## Development Workflow

1. **Code Changes**: Edit files directly - they auto-reload in container
2. **Dependencies**: Add to `package.json`, then:
   ```bash
   docker compose down
   docker compose up --build
   ```
3. **Database Changes**: Sequelize auto-syncs schema on startup
4. **View Logs**: `docker compose logs -f`

## Production Notes

For production deployment:

1. Change `NODE_ENV` to `production`
2. Change `DB_PASSWORD` to a secure password
3. Remove `volumes` with source code (use COPY instead)
4. Use `npm start` instead of `npm run dev`
5. Set up proper PostgreSQL backups
6. Use environment secrets management

## Docker Hub Images Used

- **Node.js**: `node:18-alpine` (lightweight, ~150MB)
- **PostgreSQL**: `postgres:15-alpine` (lightweight, ~80MB)

## Network

Services communicate via Docker network:
- Service DNS: Use service name (e.g., `db` for database)
- From host: Use `localhost` with published ports

## File Structure with Docker

```
student-attendance-system/
├── Dockerfile                 (Node.js image definition)
├── docker-compose.yml         (Orchestration)
├── .env                       (Docker environment variables)
├── package.json
├── src/                       (Synced to container)
├── uploads/                   (Synced to container)
├── exports/                   (Synced to container)
└── DOCKER_GUIDE.md           (This file)
```

## Useful Docker Compose Syntax

```bash
# Run one-off command
docker compose run app npm install

# Execute command in running container
docker compose exec app ls -la

# View service status
docker compose ps

# Pull latest images
docker compose pull

# Validate compose file
docker compose config
```

## Health Checks

PostgreSQL container includes a health check:
- Runs every 10 seconds
- Waits up to 5 seconds for response
- Considers healthy after 5 successful checks

App container waits for DB health check before starting.

## Next Steps

1. `docker compose up`
2. Wait for "Server running on port 5000" message
3. Test API endpoints
4. Upload Excel files
5. View logs with `docker compose logs -f`

Happy containerizing! 🐳
