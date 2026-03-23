# Deployment & Local Dev Guide

This project is developing toward a microservices architecture. Use the included `docker-compose.yml` to start local infrastructure services.

Start local infra for development:

```powershell
# from repo root
docker compose up -d
```

This will start:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- MinIO (S3-compatible) on `localhost:9000` (console at `:9001`)
- Elasticsearch on `localhost:9200` (optional)

Set environment variables (example `.env`):

```
DATABASE_URL=postgresql://scccs:scccs_pass@localhost:5432/scccs_db
REDIS_URL=redis://localhost:6379/0
MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
S3_BUCKET=scccs-files
SECRET_KEY=change-me
JWT_SECRET_KEY=change-me
```

Then start backend and frontend normally.
