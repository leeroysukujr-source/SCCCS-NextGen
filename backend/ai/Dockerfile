FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements-ai.txt /app/
RUN pip install --no-cache-dir -r requirements-ai.txt

# Copy application
COPY ai_service.py /app/

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import httpx; httpx.get('http://localhost:8001/health', timeout=5)"

# Run with gunicorn + uvicorn for production (optional, comment out for development)
# CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "ai_service:app", "--bind", "0.0.0.0:8001"]

# For development with auto-reload
CMD ["python", "-m", "uvicorn", "ai_service:app", "--host", "0.0.0.0", "--port", "8001"]
