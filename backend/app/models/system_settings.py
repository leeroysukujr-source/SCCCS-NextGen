from datetime import datetime
from app import db
import json

class SystemSetting(db.Model):
    __tablename__ = 'system_settings'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    value = db.Column(db.Text, nullable=True) # JSON stored as string
    
    # Metadata for UI generation
    category = db.Column(db.String(50), default='general') # general, security, branding, etc.
    value_type = db.Column(db.String(20), default='string') # string, boolean, number, json
    description = db.Column(db.String(255))
    is_public = db.Column(db.Boolean, default=False) # If true, exposed to unauthenticated users (e.g. login page logo)
    admin_only = db.Column(db.Boolean, default=True) # If false, maybe viewed by others? (rare)
    is_overridable = db.Column(db.Boolean, default=False) # If true, workspace admins can override this
    
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_value(self, val):
        if self.value_type == 'json' or isinstance(val, (dict, list)):
            self.value = json.dumps(val)
        elif self.value_type == 'boolean':
             self.value = 'true' if val else 'false'
        else:
            self.value = str(val)
            
    def get_value(self):
        if not self.value:
            return None
        if self.value_type == 'boolean':
            return self.value.lower() == 'true'
        if self.value_type == 'number':
            try:
                return float(self.value)
            except:
                return 0
        if self.value_type == 'json':
            try:
                return json.loads(self.value)
            except:
                return {}
        return self.value

    def to_dict(self):
        return {
            'key': self.key,
            'value': self.get_value(),
            'category': self.category,
            'value_type': self.value_type,
            'description': self.description,
            'is_public': self.is_public,
            'is_overridable': self.is_overridable,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
