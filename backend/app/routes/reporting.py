
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, ReportRequest, ReportSubmission, Workspace
from app.utils.export_generators import generate_pdf_report, generate_excel_report, generate_word_report
from datetime import datetime

reporting_bp = Blueprint('reporting', __name__)

@reporting_bp.route('/requests', methods=['POST'])
@jwt_required()
def create_report_request():
    """Create a new report request (Super Admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized. Super Admin access required'}), 403
        
    data = request.get_json()
    title = data.get('title')
    due_date_str = data.get('due_date')
    workspace_id = data.get('workspace_id') # Optional, None = all
    
    if not title:
        return jsonify({'error': 'Title is required'}), 400
        
    new_request = ReportRequest(
        title=title,
        description=data.get('description'),
        due_date=datetime.fromisoformat(due_date_str) if due_date_str else None,
        created_by=user.id,
        workspace_id=workspace_id,
        status='pending'
    )
    
    db.session.add(new_request)
    db.session.flush() # Get ID
    
    # --- Advanced Notification Logic ---
    from app.models import Notification
    
    # 1. Identify Target Admins
    target_admins = []
    if workspace_id:
        # Specific Workspace: notify admins of that workspace
        ws = Workspace.query.get(workspace_id)
        if ws:
            target_admins = User.query.filter_by(workspace_id=workspace_id, role='admin').all()
            notif_title = f"Report Requested: {title}"
            notif_msg = f"Super Admin has requested a report '{title}' for {ws.name}. Due date: {new_request.due_date.strftime('%Y-%m-%d') if new_request.due_date else 'None'}."
    else:
        # All Workspaces: notify all admins
        target_admins = User.query.filter_by(role='admin').all()
        notif_title = f"System-Wide Report Request: {title}"
        notif_msg = f"Super Admin has requested a global report: '{title}'. Please submit your workspace data."

    # 2. Create Notifications
    for admin in target_admins:
        notif = Notification(
            user_id=admin.id,
            notification_type='report_request',
            title=notif_title,
            message=notif_msg,
            priority='high',
            is_sent_email=True, # Assume we want to email them too
            action_url='/admin/reports'
        )
        db.session.add(notif)
    
    db.session.commit()
    
    return jsonify(new_request.to_dict()), 201

@reporting_bp.route('/requests', methods=['GET'])
@jwt_required()
def get_report_requests():
    """Get report requests relevant to the user"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    query = ReportRequest.query
    
    if user.role != 'super_admin':
        # Workspace admins see global requests or requests specifically for their workspace
        query = query.filter(
            (ReportRequest.workspace_id == None) | 
            (ReportRequest.workspace_id == user.workspace_id)
        )
        
    requests = query.order_by(ReportRequest.created_at.desc()).all()
    
    # Enrich with submission status for this user's workspace
    result = []
    for req in requests:
        req_dict = req.to_dict()
        if user.role != 'super_admin':
            submission = ReportSubmission.query.filter_by(
                request_id=req.id, 
                workspace_id=user.workspace_id
            ).first()
            req_dict['submission_status'] = 'submitted' if submission else 'pending'
        else:
             # For Super Admin, count submissions vs workspaces
             pass # Logic for counting can be added here
             
        result.append(req_dict)
        
    return jsonify(result), 200

@reporting_bp.route('/requests/<int:request_id>/submit', methods=['POST'])
@jwt_required()
def submit_report(request_id):
    """Submit a report for the current workspace"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role != 'admin': # Only workspace admins submit
        return jsonify({'error': 'Unauthorized. Workspace Admin required'}), 403
        
    req = ReportRequest.query.get(request_id)
    if not req:
        return jsonify({'error': 'Request not found'}), 404
        
    # Check if already submitted
    existing = ReportSubmission.query.filter_by(
        request_id=req.id,
        workspace_id=user.workspace_id
    ).first()
    
    if existing:
        return jsonify({'error': 'Report already submitted'}), 400
    
    # Auto-generate snapshot data
    # In a real system, this would gather data from various models
    snapshot_data = {
        'submitted_at': datetime.utcnow().isoformat(),
        'workspace': user.workspace_name,
        'users_count': User.query.filter_by(workspace_id=user.workspace_id).count(),
        # Add more real metrics here
    }
    
    submission = ReportSubmission(
        request_id=req.id,
        workspace_id=user.workspace_id,
        submitted_by=user.id,
        data=snapshot_data,
        notes=request.get_json().get('notes')
    )
    
    db.session.add(submission)
    db.session.commit()
    
    return jsonify(submission.to_dict()), 201

@reporting_bp.route('/export/download', methods=['POST'])
@jwt_required()
def download_export():
    """Download report in requested format"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or (user.role != 'admin' and user.role != 'super_admin'):
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    format_type = data.get('format', 'pdf')
    report_type = data.get('type', 'system') # system or submission
    
    # Gather Data based on context
    # This logic matches what we did in analytics.py but prepares it for export
    report_data = {
        'overview': {},
        'details': []
    }
    
    # Basic logic to populate report_data based on role
    if user.role == 'super_admin':
        report_data['overview']['total_users'] = User.query.count()
        report_data['details'] = [u.to_dict() for u in User.query.limit(200).all()]
    else:
        report_data['overview']['total_users'] = User.query.filter_by(workspace_id=user.workspace_id).count()
        report_data['details'] = [u.to_dict() for u in User.query.filter_by(workspace_id=user.workspace_id).limit(200).all()]
        
    
    if format_type == 'pdf':
        file_buffer = generate_pdf_report(report_data)
        mimetype = 'application/pdf'
        ext = 'pdf'
    elif format_type == 'excel':
        file_buffer = generate_excel_report(report_data)
        mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ext = 'xlsx'
    elif format_type == 'word':
        file_buffer = generate_word_report(report_data)
        mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ext = 'docx'
    else:
        return jsonify({'error': 'Invalid format'}), 400
        
    filename = f"Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
    
    return send_file(
        file_buffer,
        mimetype=mimetype,
        as_attachment=True,
        download_name=filename
    )
