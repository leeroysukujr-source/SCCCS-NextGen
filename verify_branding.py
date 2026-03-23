import requests
import json
import sqlite3
import os

BASE_URL = "http://localhost:5000/api"

def test_branding():
    print("Testing Branded Login API...")
    
    # 1. Fetch a real workspace from the correct DB in instance folder
    db_path = os.path.join("backend", "instance", "scccs.db")
    if not os.path.exists(db_path):
        print(f"Error: DB not found at {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name, slug FROM workspaces LIMIT 1")
        row = cursor.fetchone()
        conn.close()
    except Exception as e:
        print(f"DB Error: {e}")
        return
    
    if not row:
        print("No workspaces found in DB to test with.")
        return
    
    name, slug = row
    print(f"Testing branding for workspace: {name} ({slug})")
    
    # 2. Test public endpoint
    url = f"{BASE_URL}/branding/workspace/{slug}"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        print(f"SUCCESS: Received branding data: {json.dumps(data, indent=2)}")
        if data['slug'] == slug:
            print("VERIFIED: Branding data matches DB record.")
        else:
            print("ERROR: Branding data mismatch!")
    else:
        print(f"FAILED: Status {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    test_branding()
