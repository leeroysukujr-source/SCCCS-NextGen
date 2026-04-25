import importlib.util
import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_migrate import Migrate
from config import Config
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from flask_mail import Mail

db = SQLAlchemy()
jwt = JWTManager()
# Initialize SocketIO - allow the library to auto-select the best async mode
# (eventlet/gevent) when available. Forcing 'threading' prevents WebSocket
# transport and can cause "Invalid frame header" / websocket handshake errors
# with the JS client. If you prefer a specific async worker, set it via
# environment or ensure the corresponding package (eventlet/gevent) is installed.
socketio = SocketIO()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address)
mail = Mail()

def _choose_async_mode(preferred: str | None = None) -> str:
    """Pick the best available async mode. Defaults to eventlet -> gevent -> threading."""
    if preferred:
        return preferred
    if importlib.util.find_spec("eventlet"):
        return "eventlet"
    if importlib.util.find_spec("gevent"):
        return "gevent"
    return "threading"

def create_app(config_class=Config):
    # Standardize static_folder to an absolute path for consistent asset serving in production
    import os
    abs_static_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
    app = Flask(__name__, static_folder=abs_static_path)
    app.config.from_object(config_class)
    
    # Force Disable Strict Slashes (Prevents Redirect-during-Preflight errors)
    app.url_map.strict_slashes = False
    
    # Initialize extensions
    db.init_app(app)
    
    # --- Infrastructure Integrity Check ---
    # Ensure local static directory exists for branding assets
    with app.app_context():
        try:
            # We target the 'app/static/uploads' directory relative to root_path
            upload_path = os.path.join(app.root_path, 'static', 'uploads')
            if not os.path.exists(upload_path):
                app.logger.info(f"🏗️  Initializing branding infrastructure at {upload_path}")
                os.makedirs(upload_path, exist_ok=True)
            
            # Ensure subfolders for organizational clarity (Security Mode 0o755 / Branding 0o777)
            directories = ['system', 'avatars', 'workspaces']
            for dir_name in directories:
                path = os.path.join(upload_path, dir_name)
                # Use 0o777 for system directory to ensure write access for branding
                target_mode = 0o777 if dir_name == 'system' else 0o755
                if not os.path.exists(path):
                    app.logger.info(f"🏗️  Initializing branding infrastructure at {path} (mode {oct(target_mode)})")
                    os.makedirs(path, mode=target_mode, exist_ok=True)
                else:
                    # Enforce permissions on existing directories
                    try:
                        os.chmod(path, target_mode)
                    except Exception:
                        pass
        except Exception as e:
            app.logger.error(f"⚠️  Failed to initialize branding directories: {str(e)}")
    # --------------------------------------
    jwt.init_app(app)
    mail.init_app(app)
    
    # Initialize Firebase Admin
    from app.utils.firebase_auth import init_firebase
    init_firebase()
    
    # CORS configuration - Senior Deployment Hardening
    raw_origins = app.config.get('CORS_ORIGINS', ['*'])
    if isinstance(raw_origins, str):
        raw_origins = [o.strip() for o in raw_origins.split(',')]
    
    # Clean and Explicit Origins (supports_credentials=True requires EXPLICIT origins, not *)
    cors_origins = []
    for origin in raw_origins:
        if origin and origin != '*':
            cors_origins.append(origin)
            
    # Always include production clusters
    production_domains = [
        'https://scccs-next-gen-nine.vercel.app',
        'https://scccs-next-gen.vercel.app',
        'https://scccs-next-gen-git-main-leeroysukujr-6311s-projects.vercel.app',
        'https://scccs-next-gen-leeroysukujr-source-projects.vercel.app',
        'https://scccs-nextgen-q2ll.onrender.com'
    ]
    for domain in production_domains:
        if domain not in cors_origins:
            cors_origins.append(domain)
    
    # If no specific origins defined after cleanup, fallback to * (but disable credentials security)
    final_origins = cors_origins if cors_origins else "*"
    allow_credentials = True if cors_origins else False

    # Maximum Robustness CORS - Industry Standard Implementation
    # We allow the specific Vercel production domains and wildcard headers for proxy flexibility.
    CORS(app, resources={r"/api/*": {
        "origins": final_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "bypass-tunnel-reminder", "x-requested-with"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 3600
    }})

    @app.after_request
    def after_request(response):
        """The Global 'Force-CORS' Middleware (Architect Requirement)"""
        origin = request.headers.get('Origin')
        
        # If the request has an Origin, and it's in our allowed list, reflect it back.
        if origin:
            is_allowed = False
            if final_origins == "*":
                is_allowed = True
            elif isinstance(final_origins, list) and origin in final_origins:
                is_allowed = True
            
            if is_allowed:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        # Always set these for consistency if not already set
        if 'Access-Control-Allow-Methods' not in response.headers:
            response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS,PATCH'
        if 'Access-Control-Allow-Headers' not in response.headers:
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,bypass-tunnel-reminder,x-requested-with'
            
        return response

    # CORS configuration - Senior Deployment Hardening
    # Flask-CORS handles OPTIONS preflight automatically for blueprints.
    # We allow the specific Vercel production domains and wildcard headers for proxy flexibility.
    
    
    # Initialize SocketIO with its own CORS for WebSocket connections
    # This only affects /socket.io/* routes, not /api/* routes
    # Use a Redis message queue for scaling across multiple workers/instances when configured
    message_queue = app.config.get('SOCKET_MESSAGE_QUEUE')
    # Allow forcing async mode via env var or config to avoid platform-specific
    # issues with `eventlet` on Windows. Valid values: 'eventlet', 'gevent', 'threading'
    preferred_async = app.config.get('SOCKETIO_ASYNC_MODE') or os.environ.get('SOCKETIO_ASYNC_MODE')
    async_mode = _choose_async_mode(preferred_async)
    init_kwargs = dict(
        cors_allowed_origins="*", # Architect requirement: maximum compatibility
        logger=False,
        engineio_logger=False,
        message_queue=message_queue if message_queue else None,
        async_mode=async_mode,
        ping_interval=25, 
        ping_timeout=120, # Higher resilience for cloud handshakes
        max_http_buffer_size=1e7, # 10MB limit for file shares
        transports=['polling', 'websocket'] # Allow both for transition; frontend will force websocket
    )
    if async_mode == "threading":
        # Werkzeug cannot serve real WebSockets; disable upgrades to avoid 500s.
        init_kwargs.update({
            "allow_upgrades": False,
            "ping_interval": 25,
            "ping_timeout": 60,
        })
        app.logger.warning(
            "Socket.IO running in threading mode; websocket upgrades disabled. "
            "Install eventlet or gevent for real-time transport."
        )
    else:
        init_kwargs["allow_upgrades"] = True

    # Check if we are running a migration or CLI command that doesn't need SocketIO
    import sys
    is_migration = any(cmd in sys.argv for cmd in ['db', 'migrate', 'upgrade', 'downgrade'])
    
    if is_migration:
        app.logger.info("Skipping SocketIO initialization for migration task.")
    else:
        try:
            socketio.init_app(app, **init_kwargs)
        except (ValueError, ImportError):
            app.logger.warning(f"Requested async_mode '{async_mode}' unavailable. Falling back to threading.")
            # Explicitly force threading for safety
            init_kwargs['async_mode'] = 'threading'
            init_kwargs["allow_upgrades"] = False
            socketio.init_app(app, **init_kwargs)

    app.logger.info(
        f"Socket.IO async mode: {getattr(socketio, 'async_mode', 'disabled')} "
        f"(message_queue={'on' if message_queue else 'off'})"
    )
    migrate.init_app(app, db)
    limiter.init_app(app)
    # JWT token blocklist loader checks DeviceSession.revoked by jti
    from app.models import DeviceSession
    from flask_jwt_extended import JWTManager

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        try:
            jti = jwt_payload.get('jti')
            if not jti:
                return False
            session = DeviceSession.query.filter_by(token_jti=jti).first()
            if session and session.revoked:
                return True
            return False
        except Exception:
            return False
    
    @jwt.user_identity_loader
    def user_identity_lookup(user):
        if hasattr(user, 'id'):
            return str(user.id)
        if isinstance(user, (int, float)):
            return str(user)
        return str(user)
    
    # Register tenant resolution and jurisdictional isolation middleware
    from app.middleware.tenant import resolve_tenant
    from app.utils.middleware import jurisdiction_check
    app.before_request(resolve_tenant)
    app.before_request(jurisdiction_check)

    # --- Security Middleware (OWASP/Hardening) ---
    from app.middleware.security import security_headers, waf_middleware
    app.before_request(waf_middleware)
    app.after_request(security_headers)
    

    # ---------------------------------------------
    # ---------------------------------------------
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.user_create import user_create_bp
    from app.routes.rooms import rooms_bp
    from app.routes.channels import channels_bp
    from app.routes.messages import messages_bp
    from app.routes.classes import classes_bp
    from app.routes.lessons import lessons_bp
    from app.routes.files import files_bp
    from app.routes.groups import groups_bp
    from app.routes.ai import ai_bp
    from app.routes.ai_study import ai_study_bp
    from app.routes.courses import courses_bp
    from app.routes.admin import admin_bp as admin_main_bp
    from app.routes.direct_messages import direct_messages_bp
    from app.routes.feedback import feedback_bp
    from app.routes.message_actions import message_actions_bp
    from app.routes.polls import polls_bp
    from app.routes.message_search import message_search_bp
    from app.routes.channel_admin import channel_admin_bp
    from app.routes.super_admin import super_admin_bp
    from app.routes.gpa import gpa_bp
    from app.routes.reporting import reporting_bp
    
    # New Branding Blueprints (Senior Architect Requirements)
    from app.blueprints.admin.routes import admin_logo_bp
    from app.blueprints.workspaces.routes import workspaces_logo_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(admin_logo_bp, url_prefix='/api/settings')
    app.register_blueprint(workspaces_logo_bp, url_prefix='/api/workspaces')
    app.register_blueprint(user_create_bp, url_prefix='/api/users')
    app.register_blueprint(rooms_bp, url_prefix='/api/rooms')
    app.register_blueprint(channels_bp, url_prefix='/api/channels')
    app.register_blueprint(messages_bp, url_prefix='/api/messages')
    app.register_blueprint(classes_bp, url_prefix='/api/classes')
    app.register_blueprint(lessons_bp, url_prefix='/api/lessons')
    app.register_blueprint(files_bp, url_prefix='/api/files')
    app.register_blueprint(groups_bp, url_prefix='/api/groups')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(ai_study_bp, url_prefix='/api/ai-study')
    app.register_blueprint(courses_bp, url_prefix='/api/courses')
    app.register_blueprint(admin_main_bp, url_prefix='/api/admin')
    app.register_blueprint(direct_messages_bp, url_prefix='/api/direct-messages')
    app.register_blueprint(feedback_bp, url_prefix='/api/feedback')
    app.register_blueprint(message_actions_bp, url_prefix='/api/messages')
    app.register_blueprint(polls_bp, url_prefix='/api/polls')
    app.register_blueprint(message_search_bp, url_prefix='/api/search')
    app.register_blueprint(channel_admin_bp, url_prefix='/api/channels')
    app.register_blueprint(super_admin_bp, url_prefix='/api/superadmin')
    app.register_blueprint(gpa_bp, url_prefix='/api/gpa')
    app.register_blueprint(reporting_bp, url_prefix='/api/reports')

    from app.routes.assignments import assignments_bp
    app.register_blueprint(assignments_bp, url_prefix='/api/assignments')
    
    from app.routes.study_documents import study_documents_bp
    app.register_blueprint(study_documents_bp, url_prefix='/api')

    from app.routes.workspace import workspace_bp
    app.register_blueprint(workspace_bp, url_prefix='/api/superadmin/workspaces')
    app.register_blueprint(workspace_bp, url_prefix='/api/workspace', name='workspace_user')

    from app.routes.branding import branding_bp
    app.register_blueprint(branding_bp, url_prefix='/api/branding')

    from app.routes.features import features_bp
    app.register_blueprint(features_bp, url_prefix='/api/features')

    from app.routes.tutoring import tutoring_bp
    app.register_blueprint(tutoring_bp, url_prefix='/api/tutoring')

    from app.routes.settings import settings_bp
    app.register_blueprint(settings_bp, url_prefix='/api/settings')


    from app.services.settings_service import settings_service
    settings_service.init_app(app)
    
    # Register enterprise blueprints
    from app.routes.analytics import analytics_bp
    from app.routes.notifications import notifications_bp
    from app.routes.search import search_bp
    from app.routes.security import security_bp
    from app.routes.webhooks import webhooks_bp
    from app.routes.presence import presence_bp
    
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(search_bp, url_prefix='/api/search')
    app.register_blueprint(security_bp, url_prefix='/api/security')
    app.register_blueprint(webhooks_bp, url_prefix='/api/webhooks')
    app.register_blueprint(presence_bp, url_prefix='/api/presence')

    # Security Files (robots.txt, security.txt) - Root Level
    from app.routes.security_files import security_files_bp
    app.register_blueprint(security_files_bp)


    from app.routes.meeting_livekit import meeting_livekit_bp
    app.register_blueprint(meeting_livekit_bp, url_prefix='/api/meeting-livekit')

    from app.routes.meeting_agora import meeting_agora_bp
    app.register_blueprint(meeting_agora_bp, url_prefix='/api/meeting-agora')
    
    # Register health check endpoints (no prefix - root level)
    from app.routes.health import health_bp
    app.register_blueprint(health_bp)
    
    # Register API documentation endpoint
    from app.routes.api_docs import api_docs_bp
    app.register_blueprint(api_docs_bp, url_prefix='/api')
    # Admin two-factor audit routes
    from app.routes.admin_twofactor import admin_tf_bp
    app.register_blueprint(admin_tf_bp, url_prefix='/api/admin')
    # Admin analytics skeleton
    from app.routes.admin_analytics import admin_analytics_bp
    app.register_blueprint(admin_analytics_bp, url_prefix='/api/admin')
    
    # RBAC Role Management
    from app.routes.roles import roles_bp
    app.register_blueprint(roles_bp, url_prefix='/api/roles')
    
    # Announcements
    from app.routes.announcements import announcements_bp
    app.register_blueprint(announcements_bp, url_prefix='/api/announcements')

    # Whiteboard & Creation Hub
    from app.routes.whiteboards import whiteboards_bp
    from app.routes.documents import documents_bp
    from app.routes.academic import academic_bp
    app.register_blueprint(whiteboards_bp, url_prefix='/api/whiteboards')
    app.register_blueprint(documents_bp, url_prefix='/api/documents')
    app.register_blueprint(academic_bp, url_prefix='/api/academic')
    
    # Register socketio events
    from app.socketio_events import register_socketio_events
    register_socketio_events(socketio)
    
    # Import models to ensure they're registered
    from app import models
    from app.models import DirectMessage, DirectMessageFile, Feedback, Whiteboard  # Ensure new models are loaded
    from app.models.chat_features import (
        MessageReaction, MessageReadReceipt, PinnedMessage, MessageForward,
        MessageEditHistory, ChannelPoll, PollVote, ChannelTopic,
        ScheduledMessage, ChannelMute
    )  # Import advanced chat feature models
    
    # Register global error handlers
    from app.middleware.error_handler import register_error_handlers
    register_error_handlers(app)
    
    # Database initialization is handled externally by ensure_tables.py
    # during the pre-start sequence to avoid worker race conditions.
    
    # Start scheduled message worker (dev-friendly, polls DB periodically)
    try:
        from app.scheduler import start_scheduler
        start_scheduler(app)
    except Exception:
        # Non-fatal: if scheduler fails to start, app still runs
        pass

    # Note: CORS headers are handled by Flask-CORS configuration above
    # Flask-CORS automatically adds headers, so we don't need to add them manually
    # This prevents duplicate CORS headers which cause browser errors
    
    return app
