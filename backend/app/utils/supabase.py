import os
import logging
from flask import jsonify

logger = logging.getLogger(__name__)

def supabase_health_check():
    """
    Architectural Instruction: Ensure storage connectivity is resilient.
    """
    try:
        # Check if environment variables are set
        endpoint = os.getenv('S3_ENDPOINT')
        bucket = os.getenv('S3_BUCKET')
        
        if not endpoint or not bucket:
            logger.warning("Supabase S3 parameters missing from environment")
            return False, "Missing configuration"
            
        return True, "Configuration active"
    except Exception as e:
        logger.error(f"Supabase health check failed: {e}")
        return False, str(e)

def handle_supabase_error(e):
    """
    Architectural Instruction: Catch Supabase errors and return clean JSON 
    so CORS headers (in after_request) are preserved.
    """
    logger.error(f"Supabase Storage Error: {e}")
    # We return a 500 but as a clean JSON response
    # This ensures that even on failure, the @app.after_request middleware 
    # can still append the necessary CORS headers.
    return jsonify({
        'error': f"Storage service unavailable: {str(e)}",
        'success': False,
        'code': 'STORAGE_ERROR'
    }), 500
