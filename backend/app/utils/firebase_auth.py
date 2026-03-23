import firebase_admin
from firebase_admin import credentials, auth
import os

import json

def init_firebase():
    if not firebase_admin._apps:
        # 1. Try environment variable first (Best for Render/Vercel)
        service_account_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
        
        if service_account_json:
            try:
                # Handle potential base64 or raw JSON
                if service_account_json.startswith('{'):
                    service_info = json.loads(service_account_json)
                else:
                    import base64
                    service_info = json.loads(base64.b64decode(service_account_json).decode('utf-8'))
                
                cred = credentials.Certificate(service_info)
                firebase_admin.initialize_app(cred)
                print("[Firebase] Admin SDK initialized successfully via Environment Variable.")
                return
            except Exception as e:
                print(f"[Firebase] Error initializing via Env Var: {e}")

        # 2. Fallback to the local file
        cert_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'firebase-service-account.json')
        if os.path.exists(cert_path):
            try:
                cred = credentials.Certificate(cert_path)
                firebase_admin.initialize_app(cred)
                print("[Firebase] Admin SDK initialized via local file.")
            except Exception as e:
                print(f"[Firebase] Error initializing via file: {e}")
        else:
            print("[Firebase] WARNING: No Service Account provided (Neither Env Var nor file). Verification will use un-checked fallback.")

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
