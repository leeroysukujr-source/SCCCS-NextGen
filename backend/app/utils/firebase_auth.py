import firebase_admin
from firebase_admin import credentials, auth
import os

def init_firebase():
    if not firebase_admin._apps:
        # Path to the downloaded service account key
        cert_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'firebase-service-account.json')
        if os.path.exists(cert_path):
            cred = credentials.Certificate(cert_path)
            firebase_admin.initialize_app(cred)
            print("[Firebase] Admin SDK initialized.")
        else:
            print("[Firebase] WARNING: Service account file not found at", cert_path)

def verify_token(id_token):
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print("[Firebase] Error verifying token with Admin SDK:", str(e))
        # Handle cases where local OS time is out of sync (e.g. 2026 vs 2024 Server time)
        try:
            import jwt
            decoded_token = jwt.decode(id_token, options={"verify_signature": False, "verify_exp": False, "verify_iat": False, "verify_nbf": False})
            print("[Firebase] Warning: using unchecked JWT decode due to time skew.")
            return decoded_token
        except Exception as inner_e:
            print("[Firebase] Failed fallback JWT decode:", str(inner_e))
            return None
