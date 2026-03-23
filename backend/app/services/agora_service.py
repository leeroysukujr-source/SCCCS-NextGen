
import os
import time
from agora_token_builder import RtcTokenBuilder
from flask import current_app

class AgoraService:
    def __init__(self):
        self.app_id = os.getenv('AGORA_APP_ID')
        self.app_certificate = os.getenv('AGORA_APP_CERTIFICATE')
        # Token expiration time in seconds (24 hours)
        self.expiration_time_in_seconds = 3600 * 24 

    def create_token(self, channel_name, uid):
        if not self.app_id or not self.app_certificate:
            # Fallback for dev if keys missing (client might work in test mode if app is configured as such)
            current_app.logger.warning("AGORA_APP_ID or AGORA_APP_CERTIFICATE missing.")
            return None

        current_timestamp = int(time.time())
        privilege_expired_ts = current_timestamp + self.expiration_time_in_seconds
        
        # Build token with uid (int)
        # Role_Publisher = 1, Role_Subscriber = 2
        role = 1 
        
        try:
            # Ensure UID is int for this builder usage or 0
            if isinstance(uid, str):
                # We can use a hash or just 0 if we rely on string user accounts (Account)
                # But RtcTokenBuilder sample often uses int UIDs. 
                # Let's try to hash or just use 0 and let Agora assign?
                # Actually, standard is to map DB user ID to an int or use string-based UserAccount token.
                # Let's use buildTokenWithAccount for string UIDs
                token = RtcTokenBuilder.buildTokenWithAccount(
                    self.app_id, self.app_certificate, channel_name, uid, role, privilege_expired_ts)
                return token
            else:
                 token = RtcTokenBuilder.buildTokenWithUid(
                    self.app_id, self.app_certificate, channel_name, uid, role, privilege_expired_ts)
                 return token
        except Exception as e:
            current_app.logger.error(f"Error generating Agora token: {str(e)}")
            return None

# Singleton
_agora_service = None

def get_agora_service():
    global _agora_service
    if not _agora_service:
        _agora_service = AgoraService()
    return _agora_service
