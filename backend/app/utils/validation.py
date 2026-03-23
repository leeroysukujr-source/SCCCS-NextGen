"""
Input validation and sanitization utilities
"""
import re
from typing import Optional, List, Dict, Any
from flask import jsonify

def validate_email(email: str) -> bool:
    """Validate email format"""
    if not email or not isinstance(email, str):
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_username(username: str) -> bool:
    """Validate username format (alphanumeric and underscore, 3-30 chars)"""
    if not username or not isinstance(username, str):
        return False
    pattern = r'^[a-zA-Z0-9_]{3,30}$'
    return bool(re.match(pattern, username))

def sanitize_string(text: str, max_length: int = None) -> str:
    """Sanitize string input"""
    if not isinstance(text, str):
        return ''
    # Remove null bytes and control characters
    text = text.replace('\x00', '')
    text = ''.join(char for char in text if ord(char) >= 32 or char in '\n\t')
    # Trim whitespace
    text = text.strip()
    # Limit length if specified
    if max_length and len(text) > max_length:
        text = text[:max_length]
    return text

def validate_password_strength(password: str) -> Dict[str, Any]:
    """Validate password strength"""
    if not password or not isinstance(password, str):
        return {'valid': False, 'errors': ['Password is required']}
    
    errors = []
    if len(password) < 8:
        errors.append('Password must be at least 8 characters long')
    if not re.search(r'[A-Z]', password):
        errors.append('Password must contain at least one uppercase letter')
    if not re.search(r'[a-z]', password):
        errors.append('Password must contain at least one lowercase letter')
    if not re.search(r'[0-9]', password):
        errors.append('Password must contain at least one number')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'strength': 'strong' if len(errors) == 0 else 'weak'
    }

def validate_json_data(data: Dict, required_fields: List[str], optional_fields: List[str] = None) -> Dict[str, Any]:
    """Validate JSON request data"""
    if not isinstance(data, dict):
        return {'valid': False, 'errors': ['Invalid JSON data']}
    
    errors = []
    missing_fields = []
    
    for field in required_fields:
        if field not in data or data[field] is None or data[field] == '':
            missing_fields.append(field)
    
    if missing_fields:
        errors.append(f'Missing required fields: {", ".join(missing_fields)}')
    
    # Check for unexpected fields (optional)
    if optional_fields:
        allowed_fields = set(required_fields + optional_fields)
        unexpected = set(data.keys()) - allowed_fields
        if unexpected:
            # Just warn, don't error - allow extra fields for flexibility
            pass
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'missing_fields': missing_fields
    }

def validate_pagination_params(page: Optional[int], per_page: Optional[int]) -> Dict[str, int]:
    """Validate and normalize pagination parameters"""
    page = max(1, int(page)) if page else 1
    per_page = max(1, min(100, int(per_page))) if per_page else 20  # Limit to 100 max
    return {'page': page, 'per_page': per_page}

def validate_file_type(filename: str, allowed_extensions: List[str]) -> bool:
    """Validate file extension"""
    if not filename or '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in [e.lower().lstrip('.') for e in allowed_extensions]

def validate_date_format(date_string: str, format_string: str = '%Y-%m-%d') -> bool:
    """Validate date format"""
    try:
        from datetime import datetime
        datetime.strptime(date_string, format_string)
        return True
    except (ValueError, TypeError):
        return False

def validate_uuid(uuid_string: str) -> bool:
    """Validate UUID format"""
    pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(pattern, uuid_string, re.IGNORECASE))

def create_validation_error_response(errors: List[str], status_code: int = 400):
    """Create a standardized validation error response"""
    return jsonify({
        'error': 'Validation failed',
        'errors': errors,
        'status_code': status_code
    }), status_code



