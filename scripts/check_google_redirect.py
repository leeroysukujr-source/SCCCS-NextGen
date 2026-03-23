#!/usr/bin/env python3
"""check_google_redirect.py

Simple check that asks the running backend for the Google auth URL
and then requests that URL to detect common redirect_uri_mismatch errors
returned by Google's OAuth endpoint.

Usage:
  python scripts/check_google_redirect.py

This script expects the backend to be running on http://localhost:5000
and the `/api/auth/oauth/google/authorize` endpoint to be available.
"""
import sys
import requests
import json

BACKEND_AUTHORIZE = 'http://localhost:5000/api/auth/oauth/google/authorize'


def fetch_auth_url():
    try:
        resp = requests.get(BACKEND_AUTHORIZE, headers={'Origin': 'http://localhost:5173'}, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data.get('auth_url'), data.get('redirect_uri')
    except Exception as e:
        print(f"ERROR: failed to fetch auth metadata from backend: {e}")
        return None, None


def inspect_google_auth(auth_url):
    try:
        # Ask Google for the authorization page. Allow redirects so we can
        # observe the final page and any error content.
        resp = requests.get(auth_url, timeout=15, allow_redirects=True)
    except Exception as e:
        print(f"ERROR: request to Google failed: {e}")
        return {'status': 'error', 'details': str(e)}

    result = {
        'final_url': resp.url,
        'status_code': resp.status_code,
        'history': [r.status_code for r in resp.history],
        'body_snippet': resp.text[:400]
    }

    body = resp.text.lower()
    if 'redirect_uri_mismatch' in body or 'redirect_uri' in body and 'mismatch' in body:
        result['error'] = 'redirect_uri_mismatch'
        result['ok'] = False
    elif 'this app\'s request is invalid' in body or 'access blocked' in body:
        result['error'] = 'access_blocked'
        result['ok'] = False
    else:
        # If we got redirected to a Google sign-in page or consent page (accounts.google.com)
        # that's typically an indication the client_id+redirect are accepted and flow will continue.
        if 'accounts.google.com' in resp.url and resp.status_code in (200, 302):
            result['ok'] = True
        else:
            # Unknown/ambiguous - mark not ok and include snippet
            result['ok'] = False
            result['error'] = 'unknown_response'

    return result


def main():
    print('Checking backend for Google auth URL...')
    auth_url, redirect_uri = fetch_auth_url()
    if not auth_url:
        print('Failed to get auth_url from backend. Is backend running?')
        sys.exit(2)

    print('Backend returned:')
    print('  redirect_uri:', redirect_uri)
    print('  auth_url: (truncated)')
    print('    ', auth_url[:200])

    print('\nRequesting Google auth URL... (this will follow redirects)')
    res = inspect_google_auth(auth_url)

    print('\nResult:')
    print('  final_url:', res.get('final_url'))
    print('  status_code:', res.get('status_code'))
    print('  history:', res.get('history'))
    print('  ok:', res.get('ok'))
    if 'error' in res:
        print('  error:', res.get('error'))
    print('\n  body_snippet:')
    print(res.get('body_snippet'))

    if res.get('ok'):
        print('\nGoogle appears to accept the auth request (no redirect_uri_mismatch detected).')
        sys.exit(0)
    else:
        print('\nGoogle reported a problem or returned an ambiguous response.\n')
        sys.exit(1)


if __name__ == '__main__':
    main()
