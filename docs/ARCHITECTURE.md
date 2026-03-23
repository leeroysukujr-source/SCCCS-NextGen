# SCCCS Architecture Overview

This document describes a modern, scalable architecture for SCCCS and a practical incremental migration roadmap.

## Goals
- Move toward a microservices-based backend
- Support realtime events at scale (Socket.IO + Redis pub/sub)
- Use robust storage: Postgres, Redis, MinIO/S3, optional Elasticsearch
- Provide modular service domains and clear integration points

## Service Domains (recommended)
- Authentication & Authorization (Auth Service)
- Messaging Engine (Messages Service)
- Realtime Events Gateway (Socket/RTC Gateway)
- Video/Audio Services (SFU using mediasoup)
- File Storage Service (S3 API / MinIO)
- Collaboration Service (Docs, Tasks)
- Classroom / Learning Service (Courses, Assignments, Grading)
- Admin & Analytics Service

## Communication Patterns
- HTTP REST for CRUD, management endpoints
- WebSockets / Socket.IO for realtime messages and events
- Redis pub/sub for inter-service event distribution (scale across multiple instances)
- Kafka (optional) for enterprise-grade event streaming and durable event logs

## Datastores
- Primary DB: PostgreSQL
- Cache / Realtime state: Redis
- Search: ElasticSearch or MeiliSearch (optional)
- File storage: AWS S3 or self-hosted MinIO

## Deployment
- Docker Compose for local dev (Postgres, Redis, MinIO)
- Kubernetes for production (Helm charts, stateful sets)

## Next Steps (practical incremental roadmap)
1. Add dev `docker-compose.yml` with Postgres, Redis, MinIO
2. Update backend `config.py` to read Postgres+Redis+S3 env vars
3. Create `auth` service skeleton and migrate auth endpoints to it (or keep monolith for now)
4. Introduce a lightweight Realtime Gateway using Socket.IO that connects to Redis
5. Add per-user file uploads to S3/MinIO
6. Add job queue (Redis + RQ or Celery) for background tasks (transcoding, transcription)
7. Add analytics aggregator service (consumes events)

# Notes
This repo already contains a working monolith backend built with Flask and a React frontend. The recommended approach is incremental: scaffold services, add shared infra (Redis, Postgres), migrate functionality one domain at a time.
