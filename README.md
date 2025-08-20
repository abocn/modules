# modules

A Magisk/KernelSU module repository

![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)

## Setup

1. `bun install`
2. Fill in `.env`

### For Development

```bash
# Start development server
bun run dev

# Build for production
# Ensure the database is up at build-time
bun run build

# Run production server
bun run start

# Run linting
bun run lint
```

### For Production

```bash
# Copy and configure the docker-compose.yml example
cp examples/docker-compose.yml docker-compose.yml
vim docker-compose.yml

# Copy and configure .env.example
cp .env.example .env
vim .env

# Bring up DB for schema push
docker compose up postgres -d
bunx drizzle-kit push

# Build full image and start
docker compose up -d --build
```

## Database

```bash
# Push schema changes
bunx drizzle-kit push

# Open web database browser (Drizzle Studio)
bunx drizzle-kit studio
```

## API Documentation

```bash
# Regenerate OpenAPI documentation
bunx next-openapi-gen generate
```

## Tools

### set-admin.ts

#### Local Development

```bash
# Set user as admin
bun run scripts/set-admin.ts set user@example.com

# Remove admin role
bun run scripts/set-admin.ts remove user@example.com

# List all admin users
bun run scripts/set-admin.ts list
```

#### Docker/Production Environment

If modules is running in a Docker container, you can use the admin script with `docker exec`:

```bash
# Find your container name/ID
docker ps

# Set user as admin
docker exec -it your-container-name bun run scripts/set-admin.ts set user@example.com

# Remove admin role
docker exec -it your-container-name bun run scripts/set-admin.ts remove user@example.com

# List all admin users
docker exec -it your-container-name bun run scripts/set-admin.ts list
```

#### Docker Compose Environment

If you're using docker compose, you can run the script in your app service:

```bash
# Set user as admin
docker compose exec app bun run scripts/set-admin.ts set user@example.com

# Remove admin role
docker compose exec app bun run scripts/set-admin.ts remove user@example.com

# List all admin users
docker compose exec app bun run scripts/set-admin.ts list
```
