from flask import Blueprint, jsonify
from app.models import Workspace

branding_bp = Blueprint('branding', __name__)

@branding_bp.route('/workspace/<slug>', methods=['GET'])
def get_public_branding(slug):
    """Get public branding info for a workspace (no auth required)"""
    workspace = Workspace.query.filter_by(slug=slug).first_or_404()
    return jsonify({
        'name': workspace.name,
        'logo_url': workspace.logo_url,
        'slug': workspace.slug
    }), 200
