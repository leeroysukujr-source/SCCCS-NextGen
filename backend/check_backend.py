#!/usr/bin/env python3
"""
Quick script to check if backend server is running and accessible
"""
import requests
import sys

def check_backend():
    url = 'http://localhost:5000/api/auth/test'
    
    try:
        response = requests.get(url, timeout=2)
        if response.status_code == 200:
            print("✅ Backend server is running and accessible!")
            return True
        else:
            print(f"⚠️ Backend server responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend server is NOT running!")
        print("\nTo start the backend server:")
        print("1. Make sure you're in the backend directory")
        print("2. Activate your virtual environment:")
        print("   Windows: venv\\Scripts\\activate")
        print("   Linux/Mac: source venv/bin/activate")
        print("3. Run: python run.py")
        return False
    except requests.exceptions.Timeout:
        print("⏱️ Backend server is not responding (timeout)")
        return False
    except Exception as e:
        print(f"❌ Error checking backend: {e}")
        return False

if __name__ == '__main__':
    check_backend()
    sys.exit(0 if check_backend() else 1)

