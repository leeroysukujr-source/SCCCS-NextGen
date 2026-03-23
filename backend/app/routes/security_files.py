from flask import Blueprint, jsonify, request, Response

security_files_bp = Blueprint('security_files', __name__)

@security_files_bp.route('/robots.txt')
def robots_txt():
    """
    Prevent Search Engines from indexing sensitive API endpoints.
    Helps prevent Google Dorking.
    """
    content = """User-agent: *
Disallow: /api/
Disallow: /admin/
Disallow: /config/
Disallow: /.git/
Disallow: /.env
Allow: /
"""
    return Response(content, mimetype='text/plain')

@security_files_bp.route('/security.txt')
@security_files_bp.route('/.well-known/security.txt')
def security_txt():
    """
    RFC 9116 security.txt to help security researchers report vulnerabilities responsibly.
    """
    content = """Contact: mailto:security@scccs.edu
Expires: 2026-12-31T23:59:00.000Z
Preferred-Languages: en
Policy: https://sccc-nextgen.web.app/security/policy
Encryption: https://sccc-nextgen.web.app/pgp-key.txt
Acknowledgments: https://sccc-nextgen.web.app/security/hall-of-fame
"""
    return Response(content, mimetype='text/plain')
