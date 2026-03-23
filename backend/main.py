import os
import sys

# Add the current directory to path so app can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from firebase_functions import https_fn
from app import create_app, socketio
from config import Config

# Create the Flask app
flask_app = create_app(Config)

@https_fn.on_request()
def api(req: https_fn.Request) -> https_fn.Response:
    # Use the flask app to handle the request
    with flask_app.request_context(req.environ):
        return flask_app.full_dispatch_request()
