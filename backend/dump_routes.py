
import sys
import os

# Add backend directory to path
backend_path = os.path.abspath(os.path.join(os.getcwd(), 'backend'))
sys.path.append(backend_path)

from app import create_app
from config import Config

class TestConfig(Config):
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    TESTING = True
    SECRET_KEY = 'test'
    JWT_SECRET_KEY = 'test'

app = create_app(TestConfig)

print("--- REGISTERED ROUTES ---")
for rule in app.url_map.iter_rules():
    print(f"{rule.endpoint}: {rule.rule} [{', '.join(rule.methods)}]")
print("-------------------------")
