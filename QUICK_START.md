# Quick Start Guide - Docker Deployment

This is a condensed guide for quickly deploying the backend to a VPS.

## Prerequisites

- VPS with Ubuntu 20.04+
- SSH access
- Domain name (optional)

## Quick Deployment Steps

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install docker-compose-plugin -y
```

### 2. Clone/Upload Code

```bash
cd /opt
git clone <your-repo-url> retailer-comparison-backend
cd retailer-comparison-backend
```

### 3. Configure Environment

```bash
# Create .env file
cat > .env << EOF
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_DB=retailer_comparison
NODE_ENV=production
PORT=3000
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=https://yourdomain.com
EOF
```

### 4. Deploy

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy
./deploy.sh
```

Or using Docker Compose directly:

```bash
docker compose up -d --build
```

### 5. Verify

```bash
# Check status
docker compose ps

# Check health
curl http://localhost:3000/health

# View logs
docker compose logs -f backend
```

## Common Commands

```bash
# View logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Update
git pull && docker compose up -d --build
```

## Nginx Setup (Optional)

```bash
apt install nginx -y

cat > /etc/nginx/sites-available/api << EOF
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

ln -s /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

## SSL with Let's Encrypt

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d api.yourdomain.com
```

## Troubleshooting

**Container won't start:**
```bash
docker compose logs backend
```

**Database issues:**
```bash
docker compose logs postgres
docker compose exec postgres pg_isready
```

**Port already in use:**
```bash
# Change PORT in .env file
# Or stop the service using port 3000
```

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

