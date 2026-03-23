from app import create_app
from config import Config

app = create_app(Config)

print("Map of routes:")
for rule in app.url_map.iter_rules():
    print(f"{rule} {rule.methods}")
