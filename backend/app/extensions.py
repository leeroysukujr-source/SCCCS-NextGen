from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_mail import Mail

# Initialize extensions without app
db = SQLAlchemy()
jwt = JWTManager()
socketio = SocketIO()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address)
mail = Mail()
