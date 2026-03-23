import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret-key-change-in-production')
    
    _priv = os.getenv('JWT_PRIVATE_KEY')
    _pub = os.getenv('JWT_PUBLIC_KEY')
    if _priv and _pub:
        JWT_ALGORITHM = 'RS256'
        JWT_PRIVATE_KEY = _priv.replace('\\n', '\n')
        JWT_PUBLIC_KEY = _pub.replace('\\n', '\n')

    JWT_ACCESS_TOKEN_EXPIRES = False  # Set to timedelta(hours=24) for production
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///instance/scccs.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # CORS
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')
    # Socket.IO async mode (eventlet|gevent|threading). 
    SOCKETIO_ASYNC_MODE = os.getenv('SOCKETIO_ASYNC_MODE', 'eventlet')
    
    # AI Configuration
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')  # gemini-1.5-flash, gemini-1.5-pro
    AI_MODE = os.getenv('AI_MODE', 'hybrid')  # hybrid, offline, online
    OFFLINE_AI_ENABLED = os.getenv('OFFLINE_AI_ENABLED', 'true').lower() == 'true'
    ONLINE_AI_ENABLED = os.getenv('ONLINE_AI_ENABLED', 'true').lower() == 'true'
    GEMINI_ENABLED = os.getenv('GEMINI_ENABLED', 'true').lower() == 'true'
    
    # Mediasoup Configuration
    MEDIASOUP_HOST = os.getenv('MEDIASOUP_HOST', 'localhost')
    MEDIASOUP_PORT = int(os.getenv('MEDIASOUP_PORT', 4000))
    
    # File Upload
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB

    # Email Configuration for Multi-Provider Strategy
    # Provider 1: SendGrid (API)
    SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
    
    # Provider 2: Gmail (SMTP)
    GMAIL_USERNAME = os.getenv('GMAIL_USERNAME') or os.getenv('MAIL_USERNAME')
    GMAIL_PASSWORD = os.getenv('GMAIL_PASSWORD') or os.getenv('MAIL_PASSWORD')
    
    # Default Flask-Mail Config (matches Gmail usually)
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@scccs.edu')

    # Postgres / Redis / S3 (MinIO) configuration for microservices
    # PostgreSQL
    POSTGRES_USER = os.getenv('POSTGRES_USER', 'scccs')
    POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'scccs_pass')
    POSTGRES_DB = os.getenv('POSTGRES_DB', 'scccs_db')
    POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'localhost')
    POSTGRES_PORT = os.getenv('POSTGRES_PORT', '5432')
    # If DATABASE_URL is present, SQLALCHEMY_DATABASE_URI above will be used

    # Redis
    REDIS_URL = os.getenv('REDIS_URL', os.getenv('SOCKET_MESSAGE_QUEUE', 'redis://localhost:6379/0'))

    # Flask-Limiter storage (use Redis if available)
    RATELIMIT_STORAGE_URI = os.getenv('RATELIMIT_STORAGE_URI', REDIS_URL)

    # S3 / MinIO
    S3_ENDPOINT = os.getenv('S3_ENDPOINT', os.getenv('MINIO_ENDPOINT', 'http://localhost:9000'))
    S3_ACCESS_KEY = os.getenv('S3_ACCESS_KEY', os.getenv('MINIO_ROOT_USER', 'minioadmin'))
    S3_SECRET_KEY = os.getenv('S3_SECRET_KEY', os.getenv('MINIO_ROOT_PASSWORD', 'minioadmin'))
    S3_BUCKET = os.getenv('S3_BUCKET', 'scccs-files')
    
    # Server Configuration
    SERVER_HOST = os.getenv('SERVER_HOST', '0.0.0.0')
    SERVER_PORT = int(os.getenv('SERVER_PORT', 5005))
    
    # OAuth Configuration
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
    GITHUB_CLIENT_ID = os.getenv('GITHUB_CLIENT_ID', '')
    GITHUB_CLIENT_SECRET = os.getenv('GITHUB_CLIENT_SECRET', '')
    # Default to localhost for redirect URI (most common case)
    # Can be overridden with OAUTH_REDIRECT_URI env var
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://sccc-nextgen.web.app')
    OAUTH_REDIRECT_URI = os.getenv('OAUTH_REDIRECT_URI', f'{FRONTEND_URL}/auth/callback')
    # Socket.IO message queue (Redis) - use REDIS_URL or SOCKET_MESSAGE_QUEUE env var
    # NOTE: don't default to localhost:6379 to avoid connection attempts when
    # Redis is not available on developer machines. If neither env var is set,
    # leave as None to run Socket.IO in single-process mode.
    SOCKET_MESSAGE_QUEUE = os.getenv('SOCKET_MESSAGE_QUEUE') or os.getenv('REDIS_URL') or None
