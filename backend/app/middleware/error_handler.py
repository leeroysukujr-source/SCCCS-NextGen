"""
Global error handling middleware
"""
from flask import jsonify, request
from app.utils.response import server_error_response, error_response
from app.utils.logger import log_error
import traceback

def register_error_handlers(app):
    """Register global error handlers for the Flask app"""
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'error': 'Endpoint not found',
            'path': request.path,
            'status_code': 404
        }), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            'success': False,
            'error': 'Method not allowed',
            'method': request.method,
            'path': request.path,
            'status_code': 405
        }), 405
    
    @app.errorhandler(500)
    def internal_error(error):
        log_error(f"Internal server error: {str(error)}", path=request.path)
        return server_error_response(message='An internal error occurred')
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        """Handle all unhandled exceptions"""
        log_error(
            f"Unhandled exception: {str(error)}",
            path=request.path,
            method=request.method,
            exception_type=type(error).__name__
        )
        
        # In production, don't expose internal error details
        return server_error_response(message='An unexpected error occurred')
    
    @app.errorhandler(400)
    def bad_request(error):
        return error_response(message='Bad request', status_code=400)
    
    @app.errorhandler(401)
    def unauthorized(error):
        return error_response(message='Authentication required', status_code=401)
    
    @app.errorhandler(403)
    def forbidden(error):
        return error_response(message='Access forbidden', status_code=403)



