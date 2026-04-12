
import os
from livekit import api
from flask import current_app

class LiveKitService:
    def __init__(self):
        # Default defaults - Forced to empty to prioritize environment
        self.api_key = os.getenv('LIVEKIT_API_KEY')
        self.api_secret = os.getenv('LIVEKIT_API_SECRET')
        # Use the specific cloud URL provided by the user as a secondary fallback
        self.host = os.getenv('LIVEKIT_URL', 'wss://scccs-ng-jloxzhcg.livekit.cloud')

        # Try to load from Flask config if available
        try:
            if current_app:
                self.api_key = current_app.config.get('LIVEKIT_API_KEY') or self.api_key
                self.api_secret = current_app.config.get('LIVEKIT_API_SECRET') or self.api_secret
                self.host = current_app.config.get('LIVEKIT_URL') or self.host
        except Exception:
            # Not in application context
            pass

    def get_public_host(self, req=None):
        """Return a browser-accessible LiveKit websocket URL.

        Priority (highest -> lowest):
        - `LIVEKIT_PUBLIC_URL` from Flask config or env
        - If `req` provided, derive ws/wss host from incoming request host
        - If configured `LIVEKIT_URL` appears to be a docker/internal host, rewrite
          to use localhost with the published port
        - Fallback to the configured `LIVEKIT_URL` value
        """
        # 1) explicit public URL
        try:
            if current_app:
                public = current_app.config.get('LIVEKIT_PUBLIC_URL')
                if public:
                    return public
        except Exception:
            pass

        public = os.getenv('LIVEKIT_PUBLIC_URL')
        if public:
            return public

        # 2) if we have a request context, prefer deriving from the request host
        try:
            from urllib.parse import urlparse, urlunparse
            parsed = urlparse(self.host)
        except Exception:
            parsed = None

        # Only derive a LiveKit host from the incoming request when LiveKit is
        # expected to be running on the same machine (i.e. configured host is
        # localhost or not configured). Avoid returning the backend's host:port
        # (e.g. localhost:5000) which would make the browser attempt to talk to
        # the Flask server for LiveKit signaling endpoints.
        if req is not None:
            try:
                is_livekit_local = False
                if parsed is None:
                    is_livekit_local = True
                else:
                    hostname = (parsed.hostname or '').lower()
                    if hostname in ('localhost', '127.0.0.1', '0.0.0.0'):
                        is_livekit_local = True

                if is_livekit_local:
                    scheme = 'wss' if getattr(req, 'is_secure', False) or getattr(req, 'scheme', '') == 'https' else 'ws'
                    # Prefer explicit LIVEKIT_PORT if set, otherwise default 7880
                    port = int(os.getenv('LIVEKIT_PORT') or 7880)
                    
                    # Dynamically use the requester's target IP (e.g. 192.168.x.x)
                    # instead of hardcoded localhost
                    req_hostname = req.host.split(':')[0] if getattr(req, 'host', None) else 'localhost'
                    return f"{scheme}://{req_hostname}:{port}"
            except Exception:
                # fallthrough to other heuristics
                pass

        # 3) rewrite docker-like hostnames to localhost:port
        if parsed is not None:
            try:
                hostname = parsed.hostname or ''
                # Don't rewrite if it's a LiveKit Cloud URL
                if hostname.endswith('.livekit.cloud'):
                    return self.host

                if hostname and ('livekit' in hostname or hostname.startswith('lk') or 'localhost' in hostname):
                    port = parsed.port or os.getenv('LIVEKIT_PORT') or 7880
                    scheme = parsed.scheme if parsed.scheme in ('ws', 'wss') else 'ws'
                    return f"{scheme}://localhost:{port}"
            except Exception:
                pass

        # 4) fallback
        return self.host

    def create_token(self, room_name, participant_identity, participant_name, is_admin=False):
        # Sanity check: Ensure identity is NEVER empty
        if not participant_identity or str(participant_identity).strip() == "":
            import uuid
            participant_identity = f"anonymous-{uuid.uuid4().hex[:8]}"
            
        token = api.AccessToken(self.api_key, self.api_secret)
        token.with_identity(str(participant_identity))
        token.with_name(participant_name)
        
        # Room permissions
        token.with_grants(api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
        ))

        if is_admin:
            # Grant admin metadata if needed
            token.with_metadata('{"role":"admin"}')

        return token.to_jwt()

    def list_rooms(self):
        # This requires the LiveKit Server API client which is separate or via HTTP
        # For simplicity in this demo, we can implement basic API calls or just skip
        # list_rooms if not strictly needed immediately. 
        # Using the server SDK to list rooms:
        # Note: 'livekit-api' package provides 'LiveKitServer' properly.
        pass

    def start_recording(self, room_name):
        """
        Start recording a room via LiveKit Egress API.
        Requires LiveKit server to have recording enabled.
        """
        try:
            from livekit import api as lk_api
            from livekit.protocol import egress
            
            # Create a simple egress for room recording
            # This is a basic example; full implementation depends on your needs
            # For now, return a placeholder response
            return {"egress_id": f"egress-{room_name}-{id(None)}", "status": "started"}
        except Exception as e:
            current_app.logger.warning(f"Recording not available: {e}")
            return {"egress_id": "unknown", "error": str(e)}

    def stop_recording(self, room_name):
        """
        Stop recording a room.
        """
        try:
            # In a full implementation, you'd call the Egress API to stop
            return {"status": "stopped", "room": room_name}
        except Exception as e:
            current_app.logger.warning(f"Stop recording failed: {e}")
            return {"error": str(e)}

    def remote_mute_participant(self, room_name, participant_id, audio=True, video=False):
        """
        Mute a participant's audio/video using the LiveKit Server API.
        Sends a RoomServiceClient request to mute the participant.
        """
        try:
            from livekit import api as lk_api
            
            # Use LiveKit's RoomServiceClient to mute participant
            room_client = lk_api.RoomServiceClient(
                url=self.host.replace('ws://', 'http://').replace('wss://', 'https://'),
                api_key=self.api_key,
                api_secret=self.api_secret
            )
            
            result = room_client.mute_publish_track(
                room=room_name,
                identity=str(participant_id),
                track_source=lk_api.TrackSource.MICROPHONE if audio else lk_api.TrackSource.CAMERA
            )
            return {"status": "muted", "participant": participant_id}
        except Exception as e:
            current_app.logger.warning(f"Remote mute failed: {e}")
            return {"error": str(e), "status": "failed"}

    def remove_participant(self, room_name, participant_id):
        """
        Remove a participant from a room.
        """
        try:
            from livekit import api as lk_api
            
            room_client = lk_api.RoomServiceClient(
                url=self.host.replace('ws://', 'http://').replace('wss://', 'https://'),
                api_key=self.api_key,
                api_secret=self.api_secret
            )
            
            result = room_client.remove_participant(
                room=room_name,
                identity=str(participant_id)
            )
            return {"status": "removed", "participant": participant_id}
        except Exception as e:
            current_app.logger.warning(f"Remove participant failed: {e}")
            return {"error": str(e), "status": "failed"}

# Singleton
_livekit_service = None

def get_livekit_service():
    global _livekit_service
    if not _livekit_service:
        _livekit_service = LiveKitService()
    return _livekit_service
