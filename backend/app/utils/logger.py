"""
Professional logging utilities
"""
import logging
import sys
from datetime import datetime
from functools import wraps
from flask import request, g

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('app.log', encoding='utf-8')
    ]
)

logger = logging.getLogger('scccs')

def log_api_request(f):
    """Decorator to log API requests"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = datetime.utcnow()
        user_id = getattr(g, 'user_id', None) if hasattr(g, 'user_id') else None
        
        try:
            result = f(*args, **kwargs)
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            logger.info(
                f"API {request.method} {request.path} - "
                f"User: {user_id}, Status: {result[1] if isinstance(result, tuple) else 200}, "
                f"Duration: {duration:.3f}s"
            )
            
            return result
        except Exception as e:
            duration = (datetime.utcnow() - start_time).total_seconds()
            logger.error(
                f"User: {user_id}, Error: {str(e)}, Duration: {duration:.3f}s",
                exc_info=True
            )
            raise
    
    return decorated_function

class SensitiveFilter(logging.Filter):
    """Filter out sensitive info like passwords from logs"""
    def filter(self, record):
        msg = record.getMessage().lower()
        if 'password' in msg or 'token' in msg or 'secret' in msg:
            # Simple heuristic replacement (for full body logging, custom formatter is better)
            return False # Drop log or simple return True to keep but beware
        return True

# logger.addFilter(SensitiveFilter()) # Optional: Enable strictly if body logging is added

def log_info(message: str, **kwargs):
    """Log info message"""
    logger.info(message, extra=kwargs)

def log_warning(message: str, **kwargs):
    """Log warning message"""
    logger.warning(message, extra=kwargs)

def log_error(message: str, **kwargs):
    """Log error message"""
    logger.error(message, extra=kwargs, exc_info=True)

def log_debug(message: str, **kwargs):
    """Log debug message"""
    logger.debug(message, extra=kwargs)



