import json
from app.models import GlobalFeatureFlag, WorkspaceFeatureOverride

from config import Config

def get_well_known_features():
    """Returns well-known features with dynamic status based on configuration."""
    ai_enabled = bool(Config.GEMINI_API_KEY)
    
    return {
        'smart_docs': {'enabled': True, 'config': {'ai_enabled': ai_enabled, 'collaboration_enabled': True}},
        'ai_assistant': {'enabled': ai_enabled, 'config': {'model': Config.GEMINI_MODEL}},
        'study_hub': {'enabled': ai_enabled, 'config': {}},
        'data_sheets': {'enabled': True, 'config': {'formulas_enabled': True}},
        'presentations': {'enabled': True, 'config': {'ai_slides_enabled': ai_enabled}},
        'whiteboard': {'enabled': True, 'config': {'collaboration_enabled': True}},
        'creation_hub': {'enabled': True, 'config': {}}
    }

def get_effective_feature_config(workspace_id=None):
    """
    Merges global feature flags with workspace-specific overrides.
    Returns a dictionary of {feature_name: {enabled, config}}.
    """
    # Start with well-known defaults
    results = get_well_known_features()
    
    # Get all global flags (these override hardcoded defaults)
    global_flags = GlobalFeatureFlag.query.all()
    for flag in global_flags:
        results[flag.name] = {
            'enabled': flag.is_enabled,
            'config': json.loads(flag.config) if flag.config else {}
        }
    
    # If a workspace is specified, fetch and apply overrides
    if workspace_id:
        workspace_overrides = WorkspaceFeatureOverride.query.filter_by(workspace_id=workspace_id).all()
        for override in workspace_overrides:
            if override.feature_name in results:
                results[override.feature_name]['enabled'] = override.is_enabled
                if override.config:
                    results[override.feature_name]['config'] = json.loads(override.config)
            
    return results

def is_feature_enabled(feature_name, workspace_id=None):
    """
    Checks if a specific feature is enabled for a workspace.
    """
    config_map = get_effective_feature_config(workspace_id)
    feature = config_map.get(feature_name)
    if not feature:
        return True # Default to True for safety if unknown
    return feature['enabled']

def get_feature_config(feature_name, workspace_id=None):
    """
    Gets the configuration for a specific feature.
    """
    config_map = get_effective_feature_config(workspace_id)
    feature = config_map.get(feature_name)
    if not feature:
        return {}
    return feature['config']
