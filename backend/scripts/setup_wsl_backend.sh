#!/usr/bin/env bash
set -euo pipefail
# Setup and run backend in WSL (Ubuntu/Debian)
# Usage: run in WSL from project root, e.g. cd /mnt/c/Users/PC/Desktop/dd/backend && bash scripts/setup_wsl_backend.sh

# Ensure system packages
sudo apt update
sudo apt install -y python3 python3-venv python3-pip build-essential libssl-dev libffi-dev

# Create venv
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip setuptools

# Install project requirements and eventlet
if [ -f requirements.txt ]; then
  pip install -r requirements.txt
fi
pip install eventlet

# Export env for proper async mode
export SOCKETIO_ASYNC_MODE=eventlet
export FLASK_ENV=development

# Run the backend
python run.py
