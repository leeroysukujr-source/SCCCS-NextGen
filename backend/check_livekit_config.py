
import os
from dotenv import load_dotenv

# Load from .env file explicitly if possible, or rely on system env
load_dotenv()

api_key = os.getenv('LIVEKIT_API_KEY')
api_secret = os.getenv('LIVEKIT_API_SECRET')
livekit_url = os.getenv('LIVEKIT_URL') or os.getenv('VITE_LIVEKIT_URL') # Backend often uses LIVEKIT_URL

print("-" * 50)
print("LiveKit Configuration Check")
print("-" * 50)

if not livekit_url:
    print("WARNING: LIVEKIT_URL is not set.")
else:
    print(f"URL: {livekit_url}")
    if "livekit.cloud" in livekit_url:
        print("   -> Detected LiveKit Cloud URL.")
    elif "localhost" in livekit_url:
        print("   -> Detected Local LiveKit URL.")

print("")

if not api_key:
    print("ERROR: LIVEKIT_API_KEY is missing!")
else:
    print(f"API Key: {api_key[:4]}... (Length: {len(api_key)})")
    if api_key == "devkey" and "livekit.cloud" in (livekit_url or ""):
        print("CRITICAL: You are using the default 'devkey' with LiveKit Cloud.")
        print("          This WILL fail authentication.")
        print("          Please update .env with your Cloud Project API Key.")

print("")

if not api_secret:
    print("ERROR: LIVEKIT_API_SECRET is missing!")
else:
    print(f"API Secret: {api_secret[:4]}... (Length: {len(api_secret)})")
    if api_secret == "secret" and "livekit.cloud" in (livekit_url or ""):
        print("CRITICAL: You are using the default 'secret' with LiveKit Cloud.")
        print("          This WILL fail authentication.")
        print("          Please update .env with your Cloud Project Secret.")

print("-" * 50)
