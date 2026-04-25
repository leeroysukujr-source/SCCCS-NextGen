
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
    
    # Gather data based on checklist
    checklist = request.get_json().get('checklist', {})
    
    # In a real system, we fetch these from the DB
    snapshot_data = {
        'metadata': {
            'institution': user.workspace_name,
            'submitted_by': f"{user.first_name} {user.last_name}",
            'date': datetime.utcnow().isoformat(),
            'checklist': checklist
        },
        'metrics': {}
    }

    if checklist.get('userMetrics'):
        snapshot_data['metrics']['users'] = {
            'total': User.query.filter_by(workspace_id=user.workspace_id).count(),
            'students': User.query.filter_by(workspace_id=user.workspace_id, role='student').count(),
            'teachers': User.query.filter_by(workspace_id=user.workspace_id, role='teacher').count(),
            'admins': User.query.filter_by(workspace_id=user.workspace_id, role='admin').count(),
        }

    if checklist.get('activityTrends'):
        # Mocking activity trends
        snapshot_data['metrics']['activity'] = {
            'daily_active_users': 45, # Example
            'messages_sent': 1200,
            'meetings_held': 24
        }
    
    if checklist.get('academicPerformance'):
        from app.models import Class, Assignment
        snapshot_data['metrics']['academic'] = {
            'total_classes': Class.query.filter_by(workspace_id=user.workspace_id).count(),
            'total_assignments': Assignment.query.filter_by(workspace_id=user.workspace_id).count(),
            'average_grade': 82.5
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
    if report_type == 'submission':
        submission_id = data.get('submission_id')
        if not submission_id:
            return jsonify({'error': 'Submission ID required for this type'}), 400
            
        submission = ReportSubmission.query.get(submission_id)
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
            
        # Check permissions
        if user.role != 'super_admin' and submission.workspace_id != user.workspace_id:
            return jsonify({'error': 'Unauthorized access to this report'}), 403
            
        report_data = submission.data
        title = f"Report: {submission.request.title}"
    else:
        # Basic logic to populate report_data based on role
        report_data = {
            'overview': {},
            'details': []
        }
        if user.role == 'super_admin':
            report_data['overview']['total_users'] = User.query.count()
            report_data['details'] = [u.to_dict() for u in User.query.limit(200).all()]
        else:
            report_data['overview']['total_users'] = User.query.filter_by(workspace_id=user.workspace_id).count()
            report_data['details'] = [u.to_dict() for u in User.query.filter_by(workspace_id=user.workspace_id).limit(200).all()]
        title = "System Overview Report"
        
    
    if format_type == 'pdf':
        file_buffer = generate_pdf_report(report_data, title=title)
        mimetype = 'application/pdf'
        ext = 'pdf'
    elif format_type == 'excel':
        file_buffer = generate_excel_report(report_data, title=title)
        mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ext = 'xlsx'
    elif format_type == 'word':
        file_buffer = generate_word_report(report_data, title=title)
        mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ext = 'docx'
    else:
        return jsonify({'error': 'Invalid format'}), 400
        
    filename = f"{title.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
    
    return send_file(
        file_buffer,
        mimetype=mimetype,
        as_attachment=True,
        download_name=filename
    )
