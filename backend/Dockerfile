FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt ./requirements.txt
# Install build dependencies needed for some Python packages (psycopg2)
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
	   build-essential \
	   libpq-dev \
	   gcc \
	   python3-dev \
	&& rm -rf /var/lib/apt/lists/* \
	&& pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /app

EXPOSE 5000

# Start the app with the project's runner which properly monkey-patches
# the async library (eventlet/gevent) before creating the Socket.IO server.
CMD ["python", "run.py"]
