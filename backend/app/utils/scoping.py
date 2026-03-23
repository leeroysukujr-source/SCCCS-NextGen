from flask_jwt_extended import get_jwt_identity
from app.models import User

def scope_query(query, model_class):
    """
    Automatically applies workspace scoping to a query based on the current user's role.
    - Super admins: No scoping (global access).
    - Admins/Teachers/Students: Scoped to their workspace_id.
    """
    user_id = get_jwt_identity()
    if not user_id:
        return query
        
    user = User.query.get(user_id)
    if not user:
        return query
        
    # Super admins have global access
    if user.role == 'super_admin':
        return query
        
    # If the model has a workspace_id field, apply scoping
    if hasattr(model_class, 'workspace_id'):
        return query.filter(model_class.workspace_id == user.workspace_id)
    
    # Special cases for models that relate to workspace through other models
    # e.g., if we need to scope based on user_id or class_id, logic goes here.
    
    return query

def get_current_workspace_id():
    """Returns the workspace_id of the current logged-in user."""
    user_id = get_jwt_identity()
    if not user_id:
        return None
    user = User.query.get(user_id)
    return user.workspace_id if user else None
