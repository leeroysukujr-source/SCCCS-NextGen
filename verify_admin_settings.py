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

def test_admin_settings():
    print("Testing Workspace Admin Settings Ownership...")
    
    db_path = os.path.join("backend", "instance", "scccs.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Find a Workspace Admin and their workspace
    cursor.execute("SELECT u.username, u.workspace_id, w.name FROM users u JOIN workspaces w ON u.workspace_id = w.id WHERE u.role = 'admin' LIMIT 1")
    user_row = cursor.fetchone()
    
    # 2. Find another workspace they SHOULD NOT have access to
    cursor.execute("SELECT id, name FROM workspaces WHERE id != ? LIMIT 1", (user_row[1],) if user_row else (0,))
    other_row = cursor.fetchone()
    conn.close()
    
    if not user_row:
        print("No Workspace Admin found to test.")
        return
        
    username, ws_id, ws_name = user_row
    print(f"Testing with Admin: {username} for Workspace: {ws_name} (ID: {ws_id})")
    
    token = get_token(username, "password123") # Assuming default password for seeded accounts
    if not token:
        print("Failed to get auth token. Ensure account exists with password123.")
        return
        
    headers = {"Authorization": f"Bearer {token}"}

    # A. Test access to OWN workspace
    print(f"\n[A] Accessing OWN workspace (ID: {ws_id})...")
    res = requests.get(f"{BASE_URL}/super-admin/workspaces/{ws_id}", headers=headers)
    if res.status_code == 200:
        print("SUCCESS: Admin can view their own workspace.")
    else:
        print(f"FAILED: Status {res.status_code}")
        
    # B. Test access to OTHER workspace
    if other_row:
        other_id, other_name = other_row
        print(f"\n[B] Attempting to access OTHER workspace: {other_name} (ID: {other_id})...")
        res = requests.get(f"{BASE_URL}/super-admin/workspaces/{other_id}", headers=headers)
        if res.status_code == 403:
            print("SUCCESS: Access correctly DENIED to other workspace (403).")
        else:
            print(f"FAILED: Expected 403, got {res.status_code}")
    
    # C. Test updating OWN workspace
    print(f"\n[C] Attempting to update OWN workspace name...")
    new_name = ws_name + " (Updated)"
    res = requests.put(f"{BASE_URL}/super-admin/workspaces/{ws_id}", headers=headers, json={"name": new_name})
    if res.status_code == 200:
        print("SUCCESS: Admin updated their own workspace name.")
    else:
        print(f"FAILED: Status {res.status_code}")

if __name__ == "__main__":
    test_admin_settings()
