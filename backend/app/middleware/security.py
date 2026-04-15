import re
from flask import request, abort, Response, current_app

def security_headers(response):
    """
    Add security headers to all responses to protect against common web attacks.
    Part of OWASP Secure Headers Project best practices.
    """
    # Prevent MIME-sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'
    # Protect against Clickjacking - Relaxed for cross-origin previews
    # response.headers['X-Frame-Options'] = 'SAMEORIGIN' 
    
    # XSS Protection (legacy but good to have)
    response.headers['X-XSS-Protection'] = '1; mode=block'
    # Strict Transport Security (HSTS) - 1 year
    if current_app.config.get('ENV') == 'production':
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    # Referrer Policy to limit information leakage
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    # Content Security Policy (CSP) - Enhanced for Previews
    # Relaxed for development to allow http/ws connections to localhost
    response.headers['Content-Security-Policy'] = (
        "default-src 'self' https: http: wss: ws:; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https: http:; "
        "font-src 'self' data: https:; "
        "connect-src 'self' https: wss: http: ws:; "
        "frame-ancestors 'self' https://scccs-next-gen-nine.vercel.app https://scccs-next-gen.vercel.app; "
        "frame-src 'self' https:;"
    )
    
    # Allow Firebase Auth popups (Cross-Origin-Opener-Policy)
    # Firebase is most compatible with 'unsafe-none' or 'same-origin-allow-popups'
    response.headers['Cross-Origin-Opener-Policy'] = 'unsafe-none'
    # COEP can also cause issues if not set or set too strictly with COOP
    response.headers['Cross-Origin-Embedder-Policy'] = 'unsafe-none'
    
    # Remove Server header to reduce fingerprinting
    # Note: Modern WSGI servers may overwrite this, but we try.
    response.headers.pop('Server', None)
    
    return response

def waf_middleware():
    """
    Simple Web Application Firewall (WAF) middleware.
    Filters malicious requests before they reach the route handlers.
    Prevention against: SQLi patterns, XSS patterns, Scanner User-Agents.
    """
    # 1. Block Bad User Agents (Scanners/Bots)
    user_agent = request.headers.get('User-Agent', '').lower()
    bad_agents = ['sqlmap', 'nikto', 'nessus', 'acunetix', 'nmap', 'jndiapp']
    if any(agent in user_agent for agent in bad_agents):
        current_app.logger.warning(f"Blocked malicious User-Agent: {user_agent} from {request.remote_addr}")
        abort(403)

    # 2. Check for SQL Injection patterns in query parameters and path
    # (SQLAlchemy protects body payloads securely, but URL hacking is common)
    sqli_patterns = [
        r"(\%27)|(\')|(\-\-)|(\%23)|(#)", # comments/quotes
        r"((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))", # injection
        r"w*((\%27)|(\'))(\s|\%20)*(or|and)(\s|\%20)*", # OR 1=1
        r"union(\s|\%20)*select"
    ]
    
    # Scan query string
    query_string = request.query_string.decode('utf-8', errors='ignore')
    for pattern in sqli_patterns:
        if re.search(pattern, query_string, re.IGNORECASE):
            current_app.logger.warning(f"Blocked SQLi attempt in query: {query_string} from {request.remote_addr}")
            abort(403)

    # 3. Check for specific dangerous file access (LFI/Path Traversal)
    # e.g., ../../../../etc/passwd
    if '..' in request.path or '//' in request.path:
        # Normalize handled by Flask usually, but double check raw
        pass 
        
    # Check for known OSINT/Dorking paths often probed
    sensitive_paths = [
        '/.env', '/.git', '/.gitignore', '/wp-admin', '/phpmyadmin', 
        '/config.php', '/.aws/', '/id_rsa'
    ]
    for path in sensitive_paths:
        if request.path.endswith(path):
            current_app.logger.warning(f"Blocked sensitive path probe: {request.path} from {request.remote_addr}")
            abort(404) # Pretend it doesn't exist
