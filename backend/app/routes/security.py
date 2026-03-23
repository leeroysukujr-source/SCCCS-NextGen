"""
Advanced Security Routes - 2FA, Sessions, Audit Logs
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User
from app.models.security import UserSession, TwoFactorAuth, AuditLog, SecurityEvent
from app.utils.audit import log_audit_event, log_security_event
from datetime import datetime, timedelta
import pyotp
import qrcode
import io
import base64

security_bp = Blueprint('security', __name__)

@security_bp.route('/sessions', methods=['GET'])
@jwt_required()
def get_sessions():
    """Get user's active sessions"""
    current_user_id = get_jwt_identity()
    
    sessions = UserSession.query.filter(
        UserSession.user_id == current_user_id,
        UserSession.is_active == True
    ).order_by(UserSession.last_activity.desc()).all()
    
    return jsonify([s.to_dict() for s in sessions]), 200

@security_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@jwt_required()
def revoke_session(session_id):
    """Revoke a specific session"""
    current_user_id = get_jwt_identity()
    session = UserSession.query.get(session_id)
    
    if not session or session.user_id != current_user_id:
        return jsonify({'error': 'Session not found'}), 404
    
    session.is_active = False
    db.session.commit()
    
    log_audit_event(current_user_id, 'session_revoked', 'session', session_id)
    
    return jsonify({'message': 'Session revoked'}), 200

@security_bp.route('/sessions/revoke-all', methods=['POST'])
@jwt_required()
def revoke_all_sessions():
    """Revoke all sessions except current"""
    current_user_id = get_jwt_identity()
    
    UserSession.query.filter(
        UserSession.user_id == current_user_id,
        UserSession.is_active == True
    ).update({'is_active': False})
    
    db.session.commit()
    
    log_audit_event(current_user_id, 'all_sessions_revoked', 'session')
    
    return jsonify({'message': 'All sessions revoked'}), 200

@security_bp.route('/2fa/setup', methods=['GET'])
@jwt_required()
def setup_2fa():
    """Setup 2FA for user"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get or create 2FA record
    two_fa = TwoFactorAuth.query.filter_by(user_id=current_user_id).first()
    if not two_fa:
        secret = pyotp.random_base32()
        two_fa = TwoFactorAuth(
            user_id=current_user_id,
            secret_key=secret,
            is_enabled=False
        )
        db.session.add(two_fa)
        db.session.commit()
    else:
        secret = two_fa.secret_key
    
    # Generate QR code
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=user.email,
        issuer_name="SCCCS Platform"
    )
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_code = base64.b64encode(buffer.getvalue()).decode()
    
    return jsonify({
        'secret': secret,
        'qr_code': f'data:image/png;base64,{qr_code}',
        'is_enabled': two_fa.is_enabled
    }), 200

@security_bp.route('/2fa/verify', methods=['POST'])
@jwt_required()
def verify_2fa():
    """Verify 2FA code and enable"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    code = data.get('code')
    
    if not code:
        return jsonify({'error': 'Code is required'}), 400
    
    two_fa = TwoFactorAuth.query.filter_by(user_id=current_user_id).first()
    if not two_fa:
        return jsonify({'error': '2FA not set up'}), 404
    
    totp = pyotp.TOTP(two_fa.secret_key)
    if totp.verify(code, valid_window=1):
        two_fa.is_enabled = True
        db.session.commit()
        
        log_audit_event(current_user_id, '2fa_enabled', 'security')
        
        return jsonify({'message': '2FA enabled successfully'}), 200
    else:
        log_security_event(current_user_id, '2fa_verification_failed', 'medium')
        return jsonify({'error': 'Invalid code'}), 400

@security_bp.route('/2fa/disable', methods=['POST'])
@jwt_required()
def disable_2fa():
    """Disable 2FA"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    code = data.get('code')
    
    two_fa = TwoFactorAuth.query.filter_by(user_id=current_user_id).first()
    if not two_fa or not two_fa.is_enabled:
        return jsonify({'error': '2FA not enabled'}), 400
    
    # Verify code before disabling
    totp = pyotp.TOTP(two_fa.secret_key)
    if not totp.verify(code, valid_window=1):
        log_security_event(current_user_id, '2fa_disable_failed', 'medium')
        return jsonify({'error': 'Invalid code'}), 400
    
    two_fa.is_enabled = False
    db.session.commit()
    
    log_audit_event(current_user_id, '2fa_disabled', 'security')
    
    return jsonify({'message': '2FA disabled successfully'}), 200

@security_bp.route('/2fa/status', methods=['GET'])
@jwt_required()
def get_2fa_status():
    """Get 2FA status"""
    current_user_id = get_jwt_identity()
    
    two_fa = TwoFactorAuth.query.filter_by(user_id=current_user_id).first()
    if not two_fa:
        return jsonify({'is_enabled': False}), 200
    
    return jsonify(two_fa.to_dict()), 200

@security_bp.route('/audit-logs', methods=['GET'])
@jwt_required()
def get_audit_logs_routed():
    """Get audit logs with multi-tenant scoping and advanced filters"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    is_super = user.platform_role == 'SUPER_ADMIN' or user.role == 'super_admin'
    
    # Filtering parameters
    user_id = request.args.get('user_id', type=int)
    resource_type = request.args.get('resource_type')
    action = request.args.get('action')
    workspace_id = request.args.get('workspace_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    limit = request.args.get('limit', 100, type=int)
    export_csv = request.args.get('export', 'false').lower() == 'true'
    
    query = AuditLog.query.join(User, AuditLog.user_id == User.id)
    
    # Scoping: Workspace Admins ONLY see their workspace logs
    if not is_super:
        if user.role != 'admin' or not user.workspace_id:
            return jsonify({'error': 'Unauthorized'}), 403
        query = query.filter(User.workspace_id == user.workspace_id)
    else:
        # Super Admin can filter by any workspace
        if workspace_id:
            query = query.filter(User.workspace_id == workspace_id)
            
    # Advanced Filters
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if action:
        query = query.filter(AuditLog.action == action)
    if start_date:
        query = query.filter(AuditLog.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(AuditLog.created_at <= datetime.fromisoformat(end_date))
        
    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    
    if export_csv:
        import csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['ID', 'Timestamp', 'User', 'Action', 'Resource', 'Resource ID', 'Status', 'IP Address'])
        
        for log in logs:
            u = User.query.get(log.user_id)
            writer.writerow([
                log.id, 
                log.created_at.isoformat(), 
                u.username if u else f'User {log.user_id}',
                log.action,
                log.resource_type,
                log.resource_id,
                log.status,
                log.ip_address
            ])
            
        output.seek(0)
        from flask import Response
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-disposition": f"attachment; filename=audit_logs_{datetime.now().strftime('%Y%m%d%H%M')}.csv"}
        )
    
    return jsonify([log.to_dict() for log in logs]), 200

@security_bp.route('/security-events', methods=['GET'])
@jwt_required()
def get_security_events():
    """Get security events (admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    severity = request.args.get('severity')
    is_resolved = request.args.get('resolved')
    limit = request.args.get('limit', 100, type=int)
    
    query = SecurityEvent.query
    
    if severity:
        query = query.filter(SecurityEvent.severity == severity)
    if is_resolved is not None:
        query = query.filter(SecurityEvent.is_resolved == (is_resolved.lower() == 'true'))
    
    events = query.order_by(SecurityEvent.created_at.desc()).limit(limit).all()
    
    return jsonify([e.to_dict() for e in events]), 200

