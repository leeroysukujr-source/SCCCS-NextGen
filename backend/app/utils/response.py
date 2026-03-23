"""
Standardized API response utilities
"""
from flask import jsonify
from typing import Any, Dict, Optional, List

def success_response(data: Any = None, message: str = None, status_code: int = 200) -> tuple:
    """Create a standardized success response"""
    response = {'success': True}
    if message:
        response['message'] = message
    if data is not None:
        response['data'] = data
    return jsonify(response), status_code

def error_response(message: str, status_code: int = 400, errors: List[str] = None) -> tuple:
    """Create a standardized error response"""
    response = {
        'success': False,
        'error': message,
        'status_code': status_code
    }
    if errors:
        response['errors'] = errors
    return jsonify(response), status_code

def paginated_response(data: List[Any], page: int, per_page: int, total: int, message: str = None) -> tuple:
    """Create a standardized paginated response"""
    response = {
        'success': True,
        'data': data,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page if total > 0 else 0
        }
    }
    if message:
        response['message'] = message
    return jsonify(response), 200

def created_response(data: Any = None, message: str = 'Resource created successfully') -> tuple:
    """Create a standardized created response"""
    return success_response(data=data, message=message, status_code=201)

def updated_response(data: Any = None, message: str = 'Resource updated successfully') -> tuple:
    """Create a standardized updated response"""
    return success_response(data=data, message=message, status_code=200)

def deleted_response(message: str = 'Resource deleted successfully') -> tuple:
    """Create a standardized deleted response"""
    return success_response(message=message, status_code=200)

def not_found_response(message: str = 'Resource not found') -> tuple:
    """Create a standardized not found response"""
    return error_response(message=message, status_code=404)

def unauthorized_response(message: str = 'Unauthorized access') -> tuple:
    """Create a standardized unauthorized response"""
    return error_response(message=message, status_code=401)

def forbidden_response(message: str = 'Access forbidden') -> tuple:
    """Create a standardized forbidden response"""
    return error_response(message=message, status_code=403)

def validation_error_response(errors: List[str], message: str = 'Validation failed') -> tuple:
    """Create a standardized validation error response"""
    return error_response(message=message, status_code=400, errors=errors)

def server_error_response(message: str = 'Internal server error') -> tuple:
    """Create a standardized server error response"""
    return error_response(message=message, status_code=500)



