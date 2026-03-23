import requests
import sys

BASE_URL = "http://localhost:5000/api"

def login(email, password):
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
        if resp.status_code == 200:
            return resp.json()['token']
        print(f"Login failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"Login connection error: {e}")
    return None

def test_documents(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. List
    print("Fetching documents list...")
    resp = requests.get(f"{BASE_URL}/documents/", headers=headers)
    if resp.status_code != 200:
        print(f"List failed: {resp.status_code} - {resp.text}")
        return

    docs = resp.json()
    print(f"Found {len(docs)} documents.")
    for d in docs:
        print(f" - ID: {d['id']}, Title: {d['title']}")

    if not docs:
        # Create one
        print("Creating test doc...")
        resp = requests.post(f"{BASE_URL}/documents/", json={"title": "Test Doc", "doc_type": "smart_doc"}, headers=headers)
        if resp.status_code == 201:
            doc = resp.json()
            docs.append(doc)
            print(f"Created doc ID: {doc['id']}")
    
    if docs:
        target_id = docs[0]['id']
        print(f"Testing GET /documents/{target_id}...")
        resp = requests.get(f"{BASE_URL}/documents/{target_id}", headers=headers)
        print(f"GET Status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Response: {resp.text}")

        # Update
        print(f"Testing PUT /documents/{target_id}...")
        resp = requests.put(f"{BASE_URL}/documents/{target_id}", json={"title": "Updated Title"}, headers=headers)
        print(f"PUT Status: {resp.status_code}")

        # Delete
        # print(f"Testing DELETE /documents/{target_id}...")
        # resp = requests.delete(f"{BASE_URL}/documents/{target_id}", headers=headers)
        # print(f"DELETE Status: {resp.status_code}")

if __name__ == "__main__":
    # Attempt to login with known user or "student@example.com" / "password"
    # Or create a user if needed. 
    # For now, let's try a common test credential if known, or rely on previous context.
    # The debug logs showed many requests. I'll assume server state from debug script.
    
    # Actually, I'll try to signup first to ensure I have a user.
    session = requests.Session()
    email = "tester_auto@example.com"
    pwd = "password123"
    
    print("Attempting signup...")
    try:
        r = requests.post(f"{BASE_URL}/auth/register", json={
            "email": email, "password": pwd, "first_name": "Test", "last_name": "User", "role": "teacher", "username": "tester_auto"
        })
        print(f"Signup: {r.status_code}")
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

    token = login(email, pwd)
    if token:
        test_docs(token)
    else:
        # Try login with existing commonly used account if signup says "exists"
        token = login(email, pwd)
        if token:
            test_documents(token)
