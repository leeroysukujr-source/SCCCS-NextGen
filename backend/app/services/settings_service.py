import json
from flask import g
from app import db
from app.models import WorkspaceSetting, Workspace

class SettingsService:
    # Default Settings Registry
    DEFAULTS = {
        'feature_streaming_enabled': True,
        'feature_chat_enabled': True,
        'room_max_participants': 50,
        'branding_primary_color': '#3b82f6',
        'branding_allow_custom_logo': True,
        'content_moderation_level': 'standard'
    }

    def init_app(self, app):
        pass

    def get_setting(self, workspace_id, key, default=None):
        """
        Get a setting for a workspace.
        Priority: 
        1. Request-local Cache (g)
        2. Database Override
        3. Default Value
        """
        if default is None:
            default = self.DEFAULTS.get(key)
            
        # 1. Check Request Cache
        if not hasattr(g, 'workspace_settings_cache'):
            g.workspace_settings_cache = {}
            
        cache_key = f"{workspace_id}:{key}"
        if cache_key in g.workspace_settings_cache:
            return g.workspace_settings_cache[cache_key]
            
        # 2. Check Database
        setting = WorkspaceSetting.query.filter_by(workspace_id=workspace_id, key=key).first()
        
        value = default
        if setting:
            try:
                # Value stored as JSON string
                value = json.loads(setting.value)
            except:
                pass
        
        # Cache for this request
        g.workspace_settings_cache[cache_key] = value
        return value

    def set_setting(self, workspace_id, key, value, user_id=None, is_super_admin=False):
        """Update a setting for a workspace. Enforces overridable schema."""
        from app.models import SystemSetting
        from app import socketio
        
        # Check if the setting exists in system and is overridable
        sys_setting = SystemSetting.query.filter_by(key=key).first()
        if sys_setting and not sys_setting.is_overridable and not is_super_admin:
            raise ValueError(f"Setting '{key}' is not overridable by workspaces")
            
        setting = WorkspaceSetting.query.filter_by(workspace_id=workspace_id, key=key).first()
        
        if not setting:
            setting = WorkspaceSetting(workspace_id=workspace_id, key=key)
            db.session.add(setting)
            
        setting.value = json.dumps(value)
        setting.updated_by = user_id
        db.session.commit()
        
        # Real-time synchronization
        try:
            socketio.emit('institutional_setting_updated', {
                'workspace_id': workspace_id,
                'key': key,
                'value': value
            }, namespace='/')
        except:
            pass

        # Invalidate request cache if present
        if hasattr(g, 'workspace_settings_cache'):
            cache_key = f"{workspace_id}:{key}"
            if cache_key in g.workspace_settings_cache:
                del g.workspace_settings_cache[cache_key]
                
        return value

    def get_overridable_settings(self):
        """Get all system settings that are marked as overridable"""
        from app.models import SystemSetting
        settings = SystemSetting.query.filter_by(is_overridable=True).all()
        return [s.to_dict() for s in settings]

    def get_workspace_settings(self, workspace_id):
        """Get only the settings that have been overridden for this workspace"""
        overrides = WorkspaceSetting.query.filter_by(workspace_id=workspace_id).all()
        return [o.to_dict() for o in overrides]

    def get_all_settings(self, workspace_id):
        """Get all effectively applied settings (System Defaults + Workspace Overrides)"""
        from app.models import SystemSetting
        
        # 1. Get all base System Settings
        system_settings = SystemSetting.query.all()
        base_map = {s.key: s for s in system_settings}
        
        # 2. Get Workspace Overrides
        overrides = WorkspaceSetting.query.filter_by(workspace_id=workspace_id).all()
        override_map = {o.key: o for o in overrides}
        
        # 3. Build Result List
        results = []
        
        # Process all system settings
        for key, sys_setting in base_map.items():
            item = sys_setting.to_dict() # {key, value, category, is_overridable, etc}
            
            # Check for override
            if key in override_map:
                try:
                    # Apply override value
                    ov_val = json.loads(override_map[key].value)
                    item['value'] = ov_val
                    item['is_overridden'] = True
                    item['workspace_value'] = ov_val
                except:
                    pass
            else:
                item['is_overridden'] = False
                item['workspace_value'] = None
                
            results.append(item)
            
        return results

    def get_system_settings(self, public_only=False):
        """Get all system settings, optionally filtered to public ones"""
        from app.models import SystemSetting
        query = SystemSetting.query
        if public_only:
            query = query.filter_by(is_public=True)
        settings = query.all()
        return [s.to_dict() for s in settings]

    # --- System Settings (Global) ---
    
    def set_system_setting(self, key, value, category='general', value_type='string', 
                           description=None, is_public=False, admin_only=True, is_overridable=False):
        """Set or update a system setting"""
        from app.models import SystemSetting
        from app import socketio

        setting = SystemSetting.query.filter_by(key=key).first()
        
        if not setting:
            setting = SystemSetting(key=key)
            db.session.add(setting)
            
        setting.set_value(value)
        setting.category = category
        setting.value_type = value_type
        if description:
            setting.description = description
        setting.is_public = is_public
        setting.admin_only = admin_only
        setting.is_overridable = is_overridable
        
        db.session.commit()

        # Global Real-time synchronization
        try:
            socketio.emit('system_setting_updated', {
                'key': key,
                'value': setting.get_value()
            }, namespace='/')
        except:
            pass

        return setting

settings_service = SettingsService()

