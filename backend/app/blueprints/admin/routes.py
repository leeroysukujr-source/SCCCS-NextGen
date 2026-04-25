from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import SystemSetting, User
from app.utils.cache import cache_manager
from app.utils.roles import is_super_admin
from app.utils.logger import logger
from flask_cors import cross_origin
import time

admin_logo_bp = Blueprint('admin_logo', __name__)

@admin_logo_bp.route('/system/logo', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def update_system_logo_url():
    """
    Refactored: Update URL endpoint (Transition to Supabase Direct)
    Instruction: Accept JSON body with 'logo_url' for global branding.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    uid = get_jwt_identity()
    if not uid:
        return jsonify({'error': 'Unauthorized'}), 401
        
    try:
        user = User.query.get(uid)
        
        if not (is_super_admin(user) or getattr(user, 'platform_role', '') == 'SUPER_ADMIN'):
            return jsonify({'error': 'Super Admin access required', 'success': False}), 403

        # Parse JSON payload
        data = request.get_json()
        logo_url = data.get('logo_url')
        
        if not logo_url:
            return jsonify({'error': 'Missing logo_url in request body', 'success': False}), 400

        logger.info(f"🌐 Updating Global System logo to: {logo_url}")

        # Step A: Update System Settings table
        try:
            SystemSetting.query.filter_by(key='SYSTEM_LOGO_URL').update({'value': logo_url})
            SystemSetting.query.filter_by(key='branding_logo_url').update({'value': logo_url})
            db.session.commit()
        except Exception as db_err:
            db.session.rollback()
            logger.error(f"DB update failed: {db_err}")
            return jsonify({'error': 'Database update failed', 'success': False}), 500

        # Step B: Invalidate Cache
        try: cache_manager.delete('public_settings')
        except: pass
        
        return jsonify({
            "success": True, 
            "logo_url": logo_url,
            "message": "Global branding updated successfully"
        }), 200

    except Exception as e:
        logger.error(f"❌ Failed to update system logo URL: {e}")
        return jsonify({'error': str(e), 'success': False}), 500
