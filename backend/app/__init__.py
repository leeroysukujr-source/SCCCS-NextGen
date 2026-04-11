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
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    
    # Configure Search Path for Blueprint Method (Neon/PgBouncer compatible)
    from sqlalchemy import event
    @event.listens_for(db.engine, "connect")
    def set_search_path(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("SET search_path TO scccs_prod, public")
        cursor.close()
        
    jwt.init_app(app)
    mail.init_app(app)
    
    # Initialize Firebase Admin
    from app.utils.firebase_auth import init_firebase
    init_firebase()
    
    # CORS configuration
    cors_origins = app.config.get('CORS_ORIGINS', ['*'])
    if isinstance(cors_origins, str):
        if cors_origins == '*':
            cors_origins = '*'
        else:
            cors_origins = cors_origins.split(',')
    
    # Maximum Robustness CORS
    CORS(app, 
         resources={r"/api/*": {"origins": "*"}}, 
         supports_credentials=True,
         allow_headers=["*"],
         expose_headers=["*"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])

    # Remove the manual handle_preflight and after_request CORS logic 
    # to avoid duplicate headers and conflicts with Flask-CORS.
    
    
    # Initialize SocketIO with its own CORS for WebSocket connections
    # This only affects /socket.io/* routes, not /api/* routes
    # Use a Redis message queue for scaling across multiple workers/instances when configured
    message_queue = app.config.get('SOCKET_MESSAGE_QUEUE')
    # Allow forcing async mode via env var or config to avoid platform-specific
    # issues with `eventlet` on Windows. Valid values: 'eventlet', 'gevent', 'threading'
    preferred_async = app.config.get('SOCKETIO_ASYNC_MODE') or os.environ.get('SOCKETIO_ASYNC_MODE')
    async_mode = _choose_async_mode(preferred_async)
    init_kwargs = dict(
        cors_allowed_origins="*",
        logger=False,
        engineio_logger=False,
        message_queue=message_queue if message_queue else None,
        async_mode=async_mode,
        ping_interval=20,
        ping_timeout=30,
    )
    if async_mode == "threading":
        # Werkzeug cannot serve real WebSockets; disable upgrades to avoid 500s.
        init_kwargs.update({
            "allow_upgrades": False,
            "ping_interval": 15,
            "ping_timeout": 25,
        })
        app.logger.warning(
            "Socket.IO running in threading mode; websocket upgrades disabled. "
            "Install eventlet or gevent for real-time transport."
        )
    else:
        init_kwargs["allow_upgrades"] = True

    socketio.init_app(app, **init_kwargs)
    app.logger.info(
        f"Socket.IO async mode: {socketio.async_mode} "
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
    
    # Register tenant resolution middleware
    from app.middleware.tenant import resolve_tenant
    app.before_request(resolve_tenant)

    # --- Security Middleware (OWASP/Hardening) ---
    from app.middleware.security import security_headers, waf_middleware
    app.before_request(waf_middleware)
    app.after_request(security_headers)
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
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
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

    from app.routes.system_settings import system_settings_bp
    app.register_blueprint(system_settings_bp, url_prefix='/api/settings/system')

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
