import urllib.request, json
try:
    resp = urllib.request.urlopen('http://127.0.0.1:5000/health', timeout=5)
    body = resp.read().decode('utf-8')
    print('STATUS', resp.getcode())
    try:
        print(json.dumps(json.loads(body), indent=2))
    except Exception:
        print(body)
except Exception as e:
    print('ERROR', e)
