from app import create_app
import sys

def list_routes():
    app = create_app()
    with open('routes_baseline.txt', 'w', encoding='utf-8') as f:
        for rule in app.url_map.iter_rules():
            f.write(f"{rule.endpoint} | {rule.methods} | {rule.rule}\n")

if __name__ == '__main__':
    list_routes()
