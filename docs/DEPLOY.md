# Deployment Guide

## Production Deployment Steps

### 1. Backend Deployment

#### Using Gunicorn (Recommended)

```bash
cd backend
pip install gunicorn
gunicorn --bind 0.0.0.0:5000 --workers 4 --timeout 120 --worker-class eventlet -w 1 "app:create_app()"
```

#### Using Docker

Create `backend/Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN python init_db.py

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "--worker-class", "eventlet", "-w", "1", "app:create_app()"]
```

Build and run:
```bash
docker build -t scccs-backend ./backend
docker run -p 5000:5000 --env-file backend/.env scccs-backend
```

### 2. Mediasoup SFU Server Deployment

#### Using PM2 (Recommended)

```bash
cd mediasoup-server
npm install -g pm2
pm2 start server.js --name "mediasoup-sfu"
pm2 save
pm2 startup
```

#### Using Docker

Create `mediasoup-server/Dockerfile`:
```dockerfile
FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 4000

CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t scccs-mediasoup ./mediasoup-server
docker run -p 4000:4000 --env-file mediasoup-server/.env scccs-mediasoup
```

### 3. Frontend Deployment

#### Build for Production

```bash
cd frontend
npm run build
```

This creates a `dist/` folder with static files.

#### Using Nginx

Create nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/scccs-frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Mediasoup SFU
    location /mediasoup {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

#### Using Docker

Create `frontend/Dockerfile`:
```dockerfile
FROM node:22-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 4. Environment Configuration

Update production `.env` files with:
- Production database URLs
- Secure secret keys
- Production domain URLs
- API keys and credentials

### 5. Database Setup

For production, use PostgreSQL or MySQL:

#### PostgreSQL
```bash
# backend/.env
DATABASE_URL=postgresql://user:password@localhost:5432/scccs_db
```

Update `requirements.txt`:
```
psycopg2-binary==2.9.9
```

#### MySQL
```bash
# backend/.env
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/scccs_db
```

Update `requirements.txt`:
```
PyMySQL==1.1.0
```

### 6. SSL/HTTPS Setup

Using Let's Encrypt with Certbot:

```bash
sudo certbot --nginx -d your-domain.com
```

### 7. Firewall Configuration

```bash
# Allow HTTP, HTTPS, and required ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp  # Backend
sudo ufw allow 4000/tcp  # Mediasoup
sudo ufw allow 40000:49999/udp  # Mediasoup RTC ports
```

### 8. Monitoring

#### Backend Monitoring
- Use PM2 or systemd for process management
- Set up log rotation
- Monitor with tools like Sentry or New Relic

#### Mediasoup Monitoring
- Monitor room count and active connections
- Track resource usage
- Set up alerts for worker failures

### 9. Scaling Considerations

#### Backend Scaling
- Use load balancer (nginx, HAProxy)
- Multiple Gunicorn workers
- Database connection pooling
- Redis for session management

#### Mediasoup Scaling
- Multiple workers for load distribution
- Separate SFU instances per region
- Use load balancer for SFU servers

### 10. Backup Strategy

- Regular database backups
- File uploads backup
- Configuration backup
- Disaster recovery plan

## Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    env_file:
      - ./backend/.env
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/scccs.db:/app/scccs.db
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  mediasoup:
    build: ./mediasoup-server
    ports:
      - "4000:4000"
      - "40000-49999:40000-49999/udp"
    env_file:
      - ./mediasoup-server/.env

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: scccs_db
      POSTGRES_USER: scccs_user
      POSTGRES_PASSWORD: scccs_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose up -d
```

## Testing Production Deployment

1. Test authentication and authorization
2. Verify video/audio streaming
3. Check real-time chat functionality
4. Test file uploads and downloads
5. Verify AI features
6. Load testing for performance
7. Security audit

## Maintenance

- Regular security updates
- Database optimization
- Log monitoring
- Performance tuning
- User feedback collection
