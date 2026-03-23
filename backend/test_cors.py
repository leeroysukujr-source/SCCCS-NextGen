"""
Test script to verify CORS configuration
Run this after starting the backend server to check if CORS is working
"""
import requests

def test_cors():
    base_url = "http://localhost:5000"
    
    # Test OPTIONS preflight
    print("Testing OPTIONS preflight request...")
    response = requests.options(
        f"{base_url}/api/messages/channel/2",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, Authorization"
        }
    )
    print(f"OPTIONS Status: {response.status_code}")
    print(f"CORS Headers: {dict(response.headers)}")
    
    # Test GET request
    print("\nTesting GET request...")
    response = requests.get(
        f"{base_url}/api/channels",
        headers={"Origin": "http://localhost:5173"}
    )
    print(f"GET Status: {response.status_code}")
    print(f"CORS Headers: {dict(response.headers)}")
    
    print("\n✅ CORS test complete")

if __name__ == "__main__":
    test_cors()

