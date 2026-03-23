import requests
import json
import sqlite3
import os

BASE_URL = "http://127.0.0.1:5000/api"

def get_token(username, password):
    res = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
    if res.status_code == 200:
        return res.json()['access_token']
    return None

def test_settings_inheritance():
    print("Testing Settings Inheritance & Overrides...")
    
    db_path = os.path.join("backend", "instance", "scccs.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Find a Workspace Admin and their workspace
    cursor.execute("SELECT u.username, u.workspace_id, w.name FROM users u JOIN workspaces w ON u.workspace_id = w.id WHERE u.role = 'admin' LIMIT 1")
    user_row = cursor.fetchone()
    
    if not user_row:
        print("No Workspace Admin found to test.")
        conn.close()
        return
        
    username, ws_id, ws_name = user_row
    print(f"Testing with Admin: {username} for Workspace: {ws_name} (ID: {ws_id})")
    
    token = get_token(username, "password123")
    if not token:
        print("Failed to get auth token.")
        conn.close()
        return
        
    headers = {"Authorization": f"Bearer {token}"}

    # STEP 1: Check listing effective settings
    print("\n[1] Fetching effective settings...")
    res = requests.get(f"{BASE_URL}/settings", headers=headers)
    if res.status_code == 200:
        settings = res.json()
        site_name = next((s for s in settings if s['key'] == 'siteName'), None)
        print(f"Current siteName: {site_name['value'] if site_name else 'N/A'}")
        print(f"Is overridden: {site_name.get('is_overridden', False) if site_name else 'N/A'}")
    else:
        print(f"FAILED: Status {res.status_code}")
        conn.close()
        return

    # STEP 2: Apply override
    print("\n[2] Applying institutional override for 'siteName'...")
    override_val = f"Custom Site for {ws_name}"
    res = requests.patch(f"{BASE_URL}/super-admin/workspaces/{ws_id}/config", 
                         headers=headers, 
                         json={"key": "siteName", "value": override_val})
    
    if res.status_code == 200:
        print("SUCCESS: Override applied.")
    else:
        print(f"FAILED: Status {res.status_code}")
        print(res.text)

    # STEP 3: Verify effective settings again
    print("\n[3] Re-fetching effective settings to verify override...")
    res = requests.get(f"{BASE_URL}/settings", headers=headers)
    if res.status_code == 200:
        settings = res.json()
        site_name = next((s for s in settings if s['key'] == 'siteName'), None)
        print(f"Effective siteName: {site_name['value'] if site_name else 'N/A'}")
        print(f"Is overridden: {site_name.get('is_overridden', False) if site_name else 'N/A'}")
        
        if site_name and site_name['value'] == override_val and site_name.get('is_overridden'):
            print("VERIFIED: Inheritance logic works correctly.")
        else:
            print("FAILED: Inheritance logic check failed.")
    else:
        print(f"FAILED: Status {res.status_code}")

    conn.close()

if __name__ == "__main__":
    test_settings_inheritance()
