from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, GlobalFeatureFlag, WorkspaceFeatureOverride
from app.services.feature_flags import get_effective_feature_config
from app.utils.middleware import platform_super_admin_required
import json

features_bp = Blueprint('features', __name__)

@features_bp.route('/config', methods=['GET'])
@jwt_required()
def get_features():
    """Get effective feature configuration for a workspace or current user context"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    workspace_id = request.args.get('workspace_id', type=int)
    if not workspace_id and user:
        workspace_id = user.workspace_id
        
    config = get_effective_feature_config(workspace_id)
    return jsonify(config), 200

@features_bp.route('/global', methods=['GET'])
@jwt_required()
@platform_super_admin_required
def list_global_features():
    """List all global feature flags (Super Admin only)"""
    flags = GlobalFeatureFlag.query.all()
    return jsonify([f.to_dict() for f in flags]), 200

@features_bp.route('/global', methods=['POST'])
@jwt_required()
@platform_super_admin_required
def update_global_feature():
    """Create or update a global feature flag (Super Admin only)"""
    data = request.get_json()
    name = data.get('name')
    is_enabled = data.get('is_enabled', True)
    description = data.get('description', '')
    config = data.get('config')
    
    if not name:
        return jsonify({'error': 'Feature name is required'}), 400
        
    flag = GlobalFeatureFlag.query.filter_by(name=name).first()
    if not flag:
        flag = GlobalFeatureFlag(name=name)
        db.session.add(flag)
        
    flag.is_enabled = is_enabled
    if description:
        flag.description = description
    if config is not None:
        flag.config = json.dumps(config)
        
    db.session.commit()
    return jsonify(flag.to_dict()), 200

@features_bp.route('/workspace/override', methods=['POST'])
@jwt_required()
def set_my_workspace_override():
    """Set an override for the current user's workspace (Workspace Admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Unauthorized: Workspace Admin role required'}), 403
        
    data = request.get_json()
    feature_name = data.get('feature_name')
    is_enabled = data.get('is_enabled')
    config = data.get('config')
    
    if not feature_name:
        return jsonify({'error': 'feature_name is required'}), 400
        
    override = WorkspaceFeatureOverride.query.filter_by(
        workspace_id=user.workspace_id, 
        feature_name=feature_name
    ).first()
    
    if not override:
        override = WorkspaceFeatureOverride(
            workspace_id=user.workspace_id,
            feature_name=feature_name
        )
        db.session.add(override)
        
    if is_enabled is not None:
        override.is_enabled = is_enabled
    if config is not None:
        if isinstance(config, (dict, list)):
            override.config = json.dumps(config)
        else:
            override.config = str(config)
        
    db.session.commit()
    return jsonify(override.to_dict()), 200
