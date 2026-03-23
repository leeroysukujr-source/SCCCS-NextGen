"""
Middleware package for Flask application
"""
from app.middleware.error_handler import register_error_handlers

__all__ = ['register_error_handlers']

