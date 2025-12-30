# Deployment Guide - VPS with Docker

This guide will help you deploy the Retailer Comparison Backend to a VPS using Docker and Docker Compose.

## Prerequisites

- A VPS with Ubuntu 20.04+ or similar Linux distribution
- SSH access to your VPS
- Domain name (optional, but recommended)
- Basic knowledge of Linux commands

## Step 1: Initial VPS Setup

### 1.1 Connect to your VPS

```bash
ssh root@your_vps_ip
```

### 1.2 Update system packages

```bash
apt update && apt upgrade -y
```

### 1.3 Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 1.4 (Optional) Create a non-root user

```bash
adduser deploy
usermod -aG docker deploy
usermod -aG sudo deploy
su - deploy
```

## Step 2: Prepare Your Application

### 2.1 Clone or upload your code to the VPS

**Option A: Using Git (Recommended)**

```bash
# Install Git if not already installed
apt install git -y

# Clone your repository
cd /opt
git clone https://github.com/yourusername/retailer-comparison-backend.git
cd retailer-comparison-backend
```

**Option B: Using SCP (from your local machine)**

```bash
# From your local machine
scp -r retailer-comparison-backend root@your_vps_ip:/opt/
ssh root@your_vps_ip
cd /opt/retailer-comparison-backend
```

### 2.2 Create environment file

```bash
cp .env.example .env
nano .env
```

Edit the `.env` file with your configuration:

```env
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_very_secure_password_here
POSTGRES_DB=retailer_comparison
POSTGRES_PORT=5432

# Application Configuration
NODE_ENV=production
PORT=3000

# JWT Secret (generate a strong random string)
JWT_SECRET=$(openssl rand -base64 32)

# CORS Configuration (replace with your frontend domain)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

**Important:** Generate a secure JWT secret:

```bash
openssl rand -base64 32
```

Copy the output and paste it as your `JWT_SECRET` value.

## Step 3: Build and Start Containers

### 3.1 Build and start services

```bash
docker compose up -d --build
```

This will:
- Build the backend Docker image
- Pull the PostgreSQL image
- Start both containers
- Run database migrations automatically

### 3.2 Check container status

```bash
docker compose ps
```

You should see both containers running.

### 3.3 View logs

```bash
# View all logs
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# View database logs only
docker compose logs -f postgres
```

## Step 4: Verify Deployment

### 4.1 Check health endpoint

```bash
curl http://localhost:3000/health
```

You should see:
```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### 4.2 Check API documentation

Open in your browser (if you have access):
```
http://your_vps_ip:3000/api-docs
```

## Step 5: Set Up Reverse Proxy (Nginx)

### 5.1 Install Nginx

```bash
apt install nginx -y
```

### 5.2 Create Nginx configuration

```bash
nano /etc/nginx/sites-available/retailer-comparison-api
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # Replace with your domain

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Increase body size for file uploads
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 5.3 Enable the site

```bash
ln -s /etc/nginx/sites-available/retailer-comparison-api /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl restart nginx
```

### 5.4 (Optional) Set up SSL with Let's Encrypt

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
certbot --nginx -d api.yourdomain.com

# Certbot will automatically configure Nginx for HTTPS
```

## Step 6: Firewall Configuration

### 6.1 Configure UFW (Uncomplicated Firewall)

```bash
# Install UFW if not installed
apt install ufw -y

# Allow SSH
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# (Optional) Allow direct backend access (not recommended for production)
# ufw allow 3000/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

## Step 7: Database Management

### 7.1 Access PostgreSQL container

```bash
docker compose exec postgres psql -U postgres -d retailer_comparison
```

### 7.2 Run migrations manually (if needed)

```bash
docker compose exec backend npx prisma migrate deploy
```

### 7.3 Seed database (optional)

```bash
docker compose exec backend npm run prisma:seed
```

### 7.4 Backup database

```bash
# Create backup
docker compose exec postgres pg_dump -U postgres retailer_comparison > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker compose exec -T postgres psql -U postgres retailer_comparison < backup_file.sql
```

## Step 8: Monitoring and Maintenance

### 8.1 View container resource usage

```bash
docker stats
```

### 8.2 Set up log rotation

Create log rotation configuration:

```bash
nano /etc/logrotate.d/docker-containers
```

Add:

```
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
```

### 8.3 Set up automatic updates (optional)

Create a cron job for security updates:

```bash
crontab -e
```

Add:

```
0 2 * * 0 apt update && apt upgrade -y && docker compose pull && docker compose up -d
```

## Step 9: Common Commands

### Restart services

```bash
docker compose restart
```

### Stop services

```bash
docker compose down
```

### Stop and remove volumes (⚠️ This will delete your database!)

```bash
docker compose down -v
```

### Update application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build
```

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100 backend
```

## Step 10: Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs backend

# Check if port is already in use
netstat -tulpn | grep 3000

# Rebuild from scratch
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Database connection issues

```bash
# Check if database is running
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Test connection
docker compose exec backend node -e "console.log(process.env.DATABASE_URL)"
```

### Permission issues

```bash
# Fix file permissions
chown -R $USER:$USER /opt/retailer-comparison-backend
```

## Security Best Practices

1. **Change default passwords**: Always use strong, unique passwords
2. **Keep system updated**: Regularly run `apt update && apt upgrade`
3. **Use SSL/TLS**: Always use HTTPS in production
4. **Restrict database access**: Don't expose PostgreSQL port publicly
5. **Regular backups**: Set up automated database backups
6. **Monitor logs**: Regularly check application and system logs
7. **Use firewall**: Configure UFW or similar firewall
8. **Limit SSH access**: Consider using SSH keys instead of passwords

## Production Checklist

- [ ] Strong JWT_SECRET configured
- [ ] Database password is secure
- [ ] CORS_ORIGIN set to your frontend domain
- [ ] SSL certificate installed (HTTPS)
- [ ] Firewall configured
- [ ] Database backups configured
- [ ] Log rotation set up
- [ ] Monitoring in place
- [ ] Environment variables secured
- [ ] Non-root user created (optional but recommended)

## Support

If you encounter issues:

1. Check container logs: `docker compose logs -f`
2. Verify environment variables: `docker compose exec backend env`
3. Test database connection: `docker compose exec postgres pg_isready`
4. Check Nginx logs: `tail -f /var/log/nginx/error.log`

## Next Steps

After deployment:

1. Update your frontend to point to the new API URL
2. Test all API endpoints
3. Set up monitoring (e.g., PM2, New Relic, or similar)
4. Configure automated backups
5. Set up CI/CD pipeline (optional)

