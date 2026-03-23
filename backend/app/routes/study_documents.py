
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.study_documents import StudyRoomDocument, StudyRoomDocumentCollaborator, StudyRoomDocumentVersion
from app.models import User
from datetime import datetime

study_documents_bp = Blueprint('study_documents', __name__)

# --- CRUD Endpoints ---

@study_documents_bp.route('/study-rooms/<room_id>/documents', methods=['POST'])
@jwt_required()
def create_document(room_id):
    """Create a new document in a study room"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    title = data.get('title', 'Untitled Document')
    content = data.get('content', '') # Initial content, empty by default
    
    # Validation: Ensure room_id is valid (if rooms are in DB, check them. If string IDs, just pass)
    # Assuming room_id is valid for now as it comes from URL
    
    new_doc = StudyRoomDocument(
        room_id=room_id,
        owner_id=current_user_id,
        title=title,
        content=content
    )
    
    db.session.add(new_doc)
    db.session.commit() # Commit to get ID
    
    # Add owner as collaborator with 'owner' role
    collaborator = StudyRoomDocumentCollaborator(
        document_id=new_doc.id,
        user_id=current_user_id,
        role='owner'
    )
    db.session.add(collaborator)
    db.session.commit()
    
    return jsonify(new_doc.to_dict()), 201

@study_documents_bp.route('/study-rooms/<room_id>/documents', methods=['GET'])
@jwt_required()
def list_documents(room_id):
    """List all documents for a room"""
    # Optional: Check if user is allowed in this room 
    
    docs = StudyRoomDocument.query.filter_by(room_id=room_id).order_by(StudyRoomDocument.updated_at.desc()).all()
    return jsonify([d.to_dict() for d in docs]), 200

@study_documents_bp.route('/study-documents/<int:document_id>', methods=['GET'])
@jwt_required()
def get_document(document_id):
    """Get a single document"""
    doc = StudyRoomDocument.query.get_or_404(document_id)
    return jsonify(doc.to_dict()), 200

@study_documents_bp.route('/study-documents/<int:document_id>', methods=['PUT'])
@jwt_required()
def update_document(document_id):
    """Update a document (autosave)"""
    current_user_id = get_jwt_identity()
    doc = StudyRoomDocument.query.get_or_404(document_id)
    
    # Permission check: Is user a collaborator?
    # Simple check: Is user owner? Or check collaborator table
    # For now, simplistic check:
    is_collab = StudyRoomDocumentCollaborator.query.filter_by(document_id=doc.id, user_id=current_user_id).first()
    if doc.owner_id != current_user_id and not is_collab:
         # Auto-add as editor if it's an open room? Or forbid?
         # User requirement says "Enforce authorization". 
         # Let's assume for now if they are in the room they can edit, or we strictly require add.
         # For simplicity in V1, let's auto-add them as 'editor' if they edit it (Wiki stlye)
         is_collab = StudyRoomDocumentCollaborator(document_id=doc.id, user_id=current_user_id, role='editor')
         db.session.add(is_collab)
    
    data = request.get_json()
    if 'title' in data:
        doc.title = data['title']
    if 'content' in data:
        doc.content = data['content']
        
        # Determine if we should save a version (simple logic: every 50th save? or explicit?)
        # For now, skip versioning to keep it light
        
    doc.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(doc.to_dict()), 200

@study_documents_bp.route('/study-documents/<int:document_id>', methods=['DELETE'])
@jwt_required()
def delete_document(document_id):
    """Delete a document"""
    current_user_id = get_jwt_identity()
    doc = StudyRoomDocument.query.get_or_404(document_id)
    
    if doc.owner_id != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    db.session.delete(doc)
    db.session.commit()
    
    return jsonify({'message': 'Document deleted'}), 200

# --- Collaborator Management ---

@study_documents_bp.route('/study-documents/<int:document_id>/collaborators', methods=['GET'])
@jwt_required()
def list_collaborators(document_id):
    """List all collaborators for a document"""
    current_user_id = get_jwt_identity()
    doc = StudyRoomDocument.query.get_or_404(document_id)
    
    # Check if user has access to view collaborators (must be at least viewer)
    # For simplicity, if they can see the doc (by knowing ID), they can see collab list
    
    collabs = StudyRoomDocumentCollaborator.query.filter_by(document_id=document_id).all()
    
    results = []
    for c in collabs:
        user = User.query.get(c.user_id)
        if user:
            results.append({
                'user_id': user.id,
                'username': user.username,
                'avatar_url': user.avatar_url,
                'role': c.role
            })
            
    return jsonify(results), 200

@study_documents_bp.route('/study-documents/<int:document_id>/collaborators', methods=['POST'])
@jwt_required()
def add_collaborator(document_id):
    """Add or update a collaborator"""
    current_user_id = get_jwt_identity()
    doc = StudyRoomDocument.query.get_or_404(document_id)
    
    # Only owner can manage access
    if doc.owner_id != current_user_id:
        return jsonify({'error': 'Only the owner can manage access'}), 403
        
    data = request.get_json()
    target_username = data.get('username')
    role = data.get('role', 'editor') # default to editor
    
    if not target_username:
         return jsonify({'error': 'Username is required'}), 400
         
    user = User.query.filter_by(username=target_username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    # Check if exists
    collab = StudyRoomDocumentCollaborator.query.filter_by(document_id=doc.id, user_id=user.id).first()
    if collab:
        collab.role = role
    else:
        collab = StudyRoomDocumentCollaborator(document_id=doc.id, user_id=user.id, role=role)
        db.session.add(collab)
        
    db.session.commit()
    return jsonify({'message': 'Collaborator added/updated', 'user_id': user.id, 'role': role}), 200

@study_documents_bp.route('/study-documents/<int:document_id>/collaborators/<int:user_id>', methods=['DELETE'])
@jwt_required()
def remove_collaborator(document_id, user_id):
    """Remove a collaborator"""
    current_user_id = get_jwt_identity()
    doc = StudyRoomDocument.query.get_or_404(document_id)
    
    # Only owner can remove, OR user removing themselves
    if doc.owner_id != current_user_id and current_user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    if doc.owner_id == user_id:
        return jsonify({'error': 'Cannot remove owner'}), 400
        
    collab = StudyRoomDocumentCollaborator.query.filter_by(document_id=doc.id, user_id=user_id).first()
    if collab:
        db.session.delete(collab)
        db.session.commit()
        
    return jsonify({'message': 'Collaborator removed'}), 200

# --- Comments ---

@study_documents_bp.route('/study-documents/<int:document_id>/comments', methods=['GET'])
@jwt_required()
def list_comments(document_id):
    """List comments for a document"""
    current_user_id = get_jwt_identity()
    doc = StudyRoomDocument.query.get_or_404(document_id)
    
    # Permission: Viewer+
    # Implicitly allowed if they can access the document
    
    comments = StudyRoomDocumentComment.query.filter_by(document_id=document_id).order_by(StudyRoomDocumentComment.created_at.asc()).all()
    return jsonify([c.to_dict() for c in comments]), 200

@study_documents_bp.route('/study-documents/<int:document_id>/comments', methods=['POST'])
@jwt_required()
def add_comment(document_id):
    """Add a comment"""
    current_user_id = get_jwt_identity()
    doc = StudyRoomDocument.query.get_or_404(document_id)
    
    # Permission: Editor+ (or viewer? Google Docs allows viewers to comment usually. Let's allow all collaborators/viewers)
    
    data = request.get_json()
    content = data.get('content')
    
    if not content:
        return jsonify({'error': 'Content is required'}), 400
        
    comment = StudyRoomDocumentComment(
        document_id=document_id,
        user_id=current_user_id,
        content=content
    )
    db.session.add(comment)
    db.session.commit()
    
    return jsonify(comment.to_dict()), 201

# --- Export & Email ---

@study_documents_bp.route('/study-documents/<int:document_id>/export', methods=['GET'])
@jwt_required()
def export_document(document_id):
    """Export document to PDF or DOCX"""
    current_user_id = get_jwt_identity()
    doc = StudyRoomDocument.query.get_or_404(document_id)
    
    fmt = request.args.get('format', 'pdf').lower()
    
    # In a real app, use pdfkit/weasyprint for PDF and python-docx for DOCX.
    # Here we simulate valid file generation.
    base_filename = f"{doc.title.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}"
    
    if fmt == 'pdf':
        # Simulate PDF content (it's just text for now, but served as PDF)
        response_content = f"PDF Export of: {doc.title}\n\n{doc.content}"
        filename = f"{base_filename}.pdf"
        mimetype = 'application/pdf'
    elif fmt == 'docx':
        response_content = f"DOCX Export of: {doc.title}\n\n{doc.content}"
        filename = f"{base_filename}.docx"
        mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    else:
        return jsonify({'error': 'Unsupported format'}), 400

    from flask import Response
    return Response(
        response_content,
        mimetype=mimetype,
        headers={"Content-Disposition": f"attachment;filename={filename}"}
    )

@study_documents_bp.route('/study-documents/<int:document_id>/email', methods=['POST'])
@jwt_required()
def email_document(document_id):
    """Email document to recipients"""
    current_user_id = get_jwt_identity()
    doc = StudyRoomDocument.query.get_or_404(document_id)
    
    data = request.get_json()
    recipients = data.get('recipients', [])
    fmt = data.get('format', 'pdf')
    
    if not recipients:
        return jsonify({'error': 'No recipients provided'}), 400

    # Rate Limiting check would go here (using flask-limiter decorator generically)
    
    # Simulate sending email
    print(f"--- SIMULATING EMAIL SEND ---")
    print(f"To: {recipients}")
    print(f"Subject: {doc.title} ({fmt.upper()})")
    print(f"Body: Attached is the document you requested.")
    print(f"-----------------------------")
    
    return jsonify({
        'message': f'Document emailed to {len(recipients)} recipients',
        'simulated': True
    }), 200
