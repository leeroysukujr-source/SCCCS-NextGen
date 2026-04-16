import os
import stat
import eventlet

# DNS lookup time out fix for Render/Redis
# We disable greendns entirely at the environment level before patching
os.environ["EVENTLET_NO_GREENDNS"] = "yes"

# Recursive Directory & Permission Initialization
# Instruction: On every startup, the system must forcefully create and set permissions for the upload directories.
UPLOAD_DIRS = [
    'backend/static/uploads/avatars',
    'backend/static/uploads/system',
    'backend/static/uploads/workspaces'
]
for directory in UPLOAD_DIRS:
    try:
        # Determine paths relative to the project root (parent of 'backend' folder)
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        abs_path = os.path.join(project_root, directory)
        
        if not os.path.exists(abs_path):
            os.makedirs(abs_path, exist_ok=True)
        # Set directory to 755 (Read/Write/Execute for owner, Read/Execute for others)
        os.chmod(abs_path, 0o755)
        print(f"[run.py] Initialized directory: {directory}")
    except Exception as e:
        print(f"[run.py] Failed to initialize directory {directory}: {e}")

# We explicitly patch modules instead of 'all=True' to avoid TypeError in some Eventlet versions
eventlet.monkey_patch(os=True, select=True, socket=True, thread=True, time=True)

from config import Config

def _apply_monkey_patch(preferred_mode: str | None) -> str:
    """Choose the best async mode. Note: eventlet is already patched if selected."""
    if not preferred_mode:
        return "eventlet"
    return preferred_mode.lower()

_used_async = _apply_monkey_patch(os.getenv("SOCKETIO_ASYNC_MODE") or Config.SOCKETIO_ASYNC_MODE)

import socket
import subprocess
import sys
import time
from urllib.parse import urlparse


def _parse_host_port(url: str, default_port: int = 7880) -> tuple[str, int]:
    try:
        parsed = urlparse(url)
        host = parsed.hostname or "localhost"
        port = parsed.port or default_port
        return host, port
    except Exception:
        return "localhost", default_port


def _is_local_livekit(url: str) -> bool:
    host, _ = _parse_host_port(url)
    return host in ("localhost", "127.0.0.1", "0.0.0.0")


def _can_connect(host: str, port: int, timeout: float = 1.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _start_livekit_with_compose(project_root: str) -> bool:
    compose_file = os.path.join(project_root, "livekit_docker_compose.yml")
    if not os.path.exists(compose_file):
        print(f"[run.py] LiveKit autostart skipped: compose file not found at {compose_file}")
        return False

    commands = [
        ["docker", "compose", "-f", compose_file, "up", "-d", "livekit"],
        ["docker-compose", "-f", compose_file, "up", "-d", "livekit"],
    ]

    for cmd in commands:
        try:
            print(f"[run.py] Starting LiveKit via: {' '.join(cmd)}")
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            return True
        except FileNotFoundError:
            continue  # try the next variant
        except subprocess.CalledProcessError as exc:
            print(f"[run.py] LiveKit start command failed: {exc.stderr or exc}")
            return False

    print("[run.py] LiveKit autostart skipped: docker not available in PATH.")
    return False


def ensure_livekit_running():
    # Respect opt-out
    if os.getenv("LIVEKIT_AUTOSTART", "true").lower() in ("0", "false", "no"):
        print("[run.py] LiveKit autostart disabled via LIVEKIT_AUTOSTART.")
        return

    target_url = os.getenv("LIVEKIT_URL") or getattr(Config, "LIVEKIT_URL", "ws://localhost:7880")
    if not _is_local_livekit(target_url):
        print(f"[run.py] LiveKit autostart skipped (non-local host detected: {target_url}).")
        return

    host, port = _parse_host_port(target_url)
    if _can_connect(host, port):
        print(f"[run.py] LiveKit already running at {host}:{port}.")
        return

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    started = _start_livekit_with_compose(project_root)
    if not started:
        print("[run.py] LiveKit autostart failed; video/meeting features may not work until LiveKit is running.")
        return

    # Wait for the service to accept connections
    for attempt in range(12):  # ~18 seconds max
        if _can_connect(host, port):
            print(f"[run.py] LiveKit is up at {host}:{port} (after {attempt + 1} checks).")
            return
        time.sleep(1.5)

    print("[run.py] LiveKit start attempted but service is not reachable yet.")


ensure_livekit_running()

from app import create_app, socketio

app = create_app(Config)

# Self-Bootstrapping Seeder: Restore SuperAdmin governance on every boot
try:
    from seeders import run_all_seeders
    run_all_seeders(app)
except ImportError:
    print("[run.py] Seeding skipped: 'seeders' package not found.")
except Exception as e:
    print(f"[run.py] Auto-seeding failed: {e}")

if __name__ == '__main__':
    print(f"[run.py] Selected async mode: {_used_async}")
    socketio.run(
        app,
        host=Config.SERVER_HOST,
        port=Config.SERVER_PORT,
        debug=True,
        allow_unsafe_werkzeug=True
    )
