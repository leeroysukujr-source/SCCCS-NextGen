#!/usr/bin/env python3
"""Test script for AI summarization endpoints."""
import httpx
import json
import sys
import os

# Allow override via env
API_URL = os.environ.get('API_URL', 'http://localhost:8001')
API_KEY = os.environ.get('API_KEY', '')

def test_summarize(brief=False):
    """Test POST /api/ai/summarize"""
    url = f'{API_URL}/api/ai/summarize'
    headers = {}
    if API_KEY:
        headers['x-api-key'] = API_KEY
    
    transcript = '''Hello team. Today we will discuss the Q1 roadmap. 
    Action: Alice will prepare the detailed timeline. 
    Important: We need to decide on the budget by Friday.
    Follow up: Bob will send the preliminary estimates by Wednesday.
    Deadline for approval: next Monday.
    Let's make sure everyone understands the requirements.'''
    
    body = {
        'meeting_id': f'test-brief-{brief}',
        'transcript': transcript,
        'brief': brief
    }
    
    try:
        r = httpx.post(url, json=body, headers=headers, timeout=30.0)
        print(f'\nTEST: Summarize (brief={brief})')
        print(f'Status: {r.status_code}')
        if r.status_code == 200:
            resp = r.json()
            print(f'Provider: {resp.get("provider", "unknown")}')
            print(f'Request ID: {resp.get("request_id", "N/A")[:8]}...')
            print(f'Summary: {resp.get("summary_text", "")}')
            print(f'Highlights: {len(resp.get("highlights", []))}')
            return True
        else:
            print(f'Error: {r.text}')
            return False
    except Exception as e:
        print(f'FAILED: {e}')
        return False


def test_health():
    """Test GET /health"""
    url = f'{API_URL}/health'
    try:
        r = httpx.get(url, timeout=10.0)
        print(f'\nTEST: Health Check')
        print(f'Status: {r.status_code}')
        if r.status_code == 200:
            resp = r.json()
            print(f'Service: {resp.get("service")}')
            print(f'OpenAI Enabled: {resp.get("openai_enabled")}')
            return True
        else:
            print(f'Error: {r.text}')
            return False
    except Exception as e:
        print(f'FAILED: {e}')
        return False


if __name__ == '__main__':
    print(f'API URL: {API_URL}')
    print(f'API Key: {"Set" if API_KEY else "Not set"}')
    
    results = []
    results.append(test_health())
    results.append(test_summarize(brief=False))
    results.append(test_summarize(brief=True))
    
    print(f'\n\nResults: {sum(results)}/{len(results)} tests passed')
    sys.exit(0 if all(results) else 1)

