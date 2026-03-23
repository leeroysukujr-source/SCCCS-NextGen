import os
import sys
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "."))
sys.path.insert(0, project_root)

from config import Config
print(f"GOOGLE_CLIENT_ID: {Config.GOOGLE_CLIENT_ID[:10]}...")
print(f"GOOGLE_CLIENT_SECRET: {'SET' if Config.GOOGLE_CLIENT_SECRET else 'NOT SET'}")
print(f"OAUTH_REDIRECT_URI: {Config.OAUTH_REDIRECT_URI}")
print(f"FRONTEND_URL: {Config.FRONTEND_URL}")
