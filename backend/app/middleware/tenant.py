from flask import request, g, has_request_context, abort
from functools import wraps
from app.models import Workspace

class TenantContext:
    def __init__(self):
        self._bypass = False

    def bypass(self):
        self._bypass = True
    
    def enforce(self):
        self._bypass = False

    @property
    def is_bypassed(self):
        return self._bypass

tenant_context = TenantContext()

def get_current_workspace_id():
    """Get the current workspace ID from the request context."""
    if has_request_context():
        return getattr(g, 'workspace_id', None)
    return None

def resolve_tenant():
    """
    Middleware function to resolve the current tenant (workspace).
    It checks:
    1. X-Workspace-ID header
    2. Subdomain (if configured - placeholder logic)
    3. User's default workspace (if logged in and no header)
    """
    
    # 1. Check Header
    workspace_id = request.headers.get('X-Workspace-ID')
    
    # 2. Check User Context (if authenticated via other middleware first)
    # Note: Dependent on auth middleware running before or after. 
    # Usually auth runs first. if g.user is set.
    user = getattr(g, 'user', None)

    if not workspace_id and user and user.workspace_id:
        workspace_id = user.workspace_id

    # 3. Validation
    if workspace_id:
        try:
            workspace_id = int(workspace_id)
            # Verify existence (optional caching here would be good)
            # For now, simplistic check or assume valid if authenticated user belongs to it.
            # strict check:
            # workspace = Workspace.query.get(workspace_id)
            # if not workspace:
            #     abort(404, description="Workspace not found")
        except ValueError:
            workspace_id = None
    
    g.workspace_id = workspace_id

def require_workspace(f):
    """Decorator to require a resolved workspace."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not get_current_workspace_id() and not tenant_context.is_bypassed:
             # If superadmin, maybe allow? But this decorator implies workspace context is NEEDED.
             # If strictly required:
             abort(400, description="X-Workspace-ID header is required")
        return f(*args, **kwargs)
    return decorated_function

def tenant_scope_filter(query, model):
    """
    Helper to filter a query by the current workspace.
    Usage: query = tenant_scope_filter(Model.query, Model)
    """
    if tenant_context.is_bypassed:
        return query
    
    workspace_id = get_current_workspace_id()
    if workspace_id and hasattr(model, 'workspace_id'):
        return query.filter(model.workspace_id == workspace_id)
    
    return query
