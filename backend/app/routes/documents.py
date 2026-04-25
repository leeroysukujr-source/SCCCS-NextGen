from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from datetime import datetime
import sys
import traceback
import json

documents_bp = Blueprint('documents', __name__)

def log_action(user_id, action, target_type, target_id, metadata=None):
    from app.models.security import AuditLog
    log = AuditLog(
        user_id=user_id,
        action=action.lower(),
        resource_type=target_type,
        resource_id=target_id,
        details_data=json.dumps(metadata) if metadata else None
    )
    db.session.add(log)

@documents_bp.route('/', methods=['GET'])
@jwt_required()
def get_documents():
    try:
        from app.models.document import Document, DocumentPermission
        from app.models import User
        from sqlalchemy import or_
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        doc_type = request.args.get('type')
        filter_mode = request.args.get('filter')
        group_id = request.args.get('group_id')
        
        query = Document.query.filter(Document.workspace_id == user.workspace_id)
        
        if group_id:
            query = query.filter(Document.group_id == group_id)
        
        # Pre-fetch permitted document IDs
        permitted_doc_ids = [r[0] for r in db.session.query(DocumentPermission.document_id).filter_by(user_id=current_user_id).all()]
        
        if group_id:
            # For group specific documents, if the user specifies group_id, 
            # we allow seeing them if they are active.
            # (Security: In a real app we'd verify user is in the group)
            query = query.filter(Document.status == 'active')
        elif filter_mode == 'trash':
            query = query.filter(Document.status == 'trashed', Document.owner_id == current_user_id)
        elif filter_mode == 'shared':
            query = query.filter(
                Document.status == 'active',
                Document.owner_id != current_user_id,
                or_(
                    Document.visibility.in_(['public', 'workspace']),
                    Document.id.in_(permitted_doc_ids) if permitted_doc_ids else False
                )
            )
        elif filter_mode == 'starred':
            query = query.filter(Document.status == 'active', Document.owner_id == current_user_id, Document.is_starred == True)
        else:
            query = query.filter(Document.status == 'active')
            query = query.filter(
                or_(
                    Document.owner_id == current_user_id,
                    Document.visibility == 'public',
                    Document.visibility == 'workspace',
                    Document.id.in_(permitted_doc_ids) if permitted_doc_ids else False
                )
            )
        
        if doc_type:
            query = query.filter(Document.doc_type == doc_type)
            
        documents = query.order_by(Document.updated_at.desc()).all()
        
        return jsonify([doc.to_dict() for doc in documents])
    except Exception as e:
        print(f"ERROR in get_documents: {str(e)}", file=sys.stderr)
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
        
    # End of get_documents

@documents_bp.route('/', methods=['POST'])
@jwt_required()
def create_document():
    try:
        from app.models.document import Document
        from app.models import User
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        data = request.get_json()
        doc_type = data.get('doc_type', 'smart_doc')
        
        if user.role == 'student' and doc_type in ['rubric', 'assignment']:
            return jsonify({'error': 'Unauthorized: Students cannot create rubrics or assignments'}), 403
        
        # Ensure group_id is integer if provided
        group_id = data.get('group_id')
        if group_id is not None:
            try:
                group_id = int(group_id)
            except:
                group_id = None

        new_doc = Document(
            title=data.get('title', 'Untitled Document'),
            content=data.get('content', ''),
            doc_type=doc_type,
            owner_id=current_user_id,
            workspace_id=user.workspace_id,
            visibility=data.get('visibility', 'private'),
            group_id=group_id,
            status='active'
        )
        
        db.session.add(new_doc)
        db.session.flush()
        log_action(current_user_id, 'CREATE', 'document', new_doc.id)
        db.session.commit()
        
        return jsonify(new_doc.to_dict()), 201
    except Exception as e:
        print(f"ERROR in create_document: {str(e)}", file=sys.stderr)
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_document(id):
    from app.models.document import Document, DocumentPermission
    current_user_id = int(get_jwt_identity())
    print(f"[DEBUG] get_document called with ID: {id}, User: {current_user_id}")
    doc = Document.query.get(id)
    if not doc:
        print(f"[DEBUG] Document {id} NOT FOUND in DB")
        return jsonify({'error': f'Document {id} not found'}), 404
    
    if doc.status == 'trashed':
        return jsonify({'error': 'Document is in trash'}), 404
        
    from app.models import User
    user = User.query.get(current_user_id)
    is_owner = doc.owner_id == current_user_id
    is_staff = user and user.role in ['admin', 'teacher'] and user.workspace_id == doc.workspace_id
    
    if not is_owner and not is_staff and doc.visibility == 'private':
        # Check explicit permission
        perm = DocumentPermission.query.filter_by(document_id=id, user_id=current_user_id).first()
        if not perm:
            return jsonify({'error': 'Unauthorized'}), 403
    print(f"[get_document] Fetching document ID: {id}, status: {doc.status}, visibility: {doc.visibility}, owner: {doc.owner_id}")
    return jsonify(doc.to_dict()), 200

@documents_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_document(id):
    from app.models.document import Document, DocumentPermission, DocumentVersion
    current_user_id = int(get_jwt_identity())
    print(f"[DEBUG] update_document called with ID: {id}, User: {current_user_id}")
    doc = Document.query.get(id)
    if not doc:
        print(f"[DEBUG] Document {id} NOT FOUND in DB")
        return jsonify({'error': f'Document {id} not found'}), 404
    
    from app.models import User
    user = User.query.get(current_user_id)
    is_owner = doc.owner_id == current_user_id
    is_staff = user and user.role in ['admin', 'teacher'] and user.workspace_id == doc.workspace_id
    
    # Check write access (owner or edit/manage level or workspace staff)
    if not is_owner and not is_staff:
        perm = DocumentPermission.query.filter_by(document_id=id, user_id=current_user_id).first()
        if not perm or perm.access_level not in ['edit', 'manage']:
            print(f"Update failed: User {current_user_id} is not owner {doc.owner_id} and has no permission.", file=sys.stderr)
            return jsonify({'error': 'No write access'}), 403
            
    # Verification passed
    print(f"[update_document] Updating ID: {id}, Owner: {doc.owner_id}, Current User: {current_user_id}")
            
    data = request.get_json()
    if 'title' in data:
        doc.title = data['title']
    if 'content' in data:
        # Create a version before updating if requested or every N saves (mock)
        if data.get('save_version'):
            last_v = DocumentVersion.query.filter_by(document_id=id).order_by(DocumentVersion.version_number.desc()).first()
            new_v = DocumentVersion(
                document_id=id,
                content=doc.content,
                version_number=(last_v.version_number + 1) if last_v else 1,
                label=data.get('version_label'),
                created_by=current_user_id
            )
            db.session.add(new_v)
        doc.content = data['content']
        
    if 'visibility' in data and doc.owner_id == current_user_id:
        doc.visibility = data['visibility']
        
        # Synchronization: If this is an assignment, update the underlying Assignment model
        if doc.doc_type == 'assignment' and doc.visibility == 'workspace':
            try:
                content_data = json.loads(doc.content)
                asg_id = content_data.get('assignmentId')
                if asg_id:
                    from app.models import Assignment
                    asg = Assignment.query.get(asg_id)
                    if asg:
                        asg.status = 'published'
                        # Also if it's workspace-wide, ensure channel_id is None or reachable
                        # For now just set status to published so it shows up in GroupStudy
            except Exception as e:
                print(f"Sync error: {e}")
        
    if 'is_starred' in data:
        doc.is_starred = bool(data['is_starred'])
        
    if 'is_verified' in data and user.role == 'admin':
        doc.is_verified = bool(data['is_verified'])
        
    doc.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(doc.to_dict()), 200

@documents_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_document(id):
    from app.models.document import Document
    current_user_id = int(get_jwt_identity())
    print(f"[delete_document] Request to delete ID: {id} by User: {current_user_id}")
    doc = Document.query.get(id)
    if not doc:
        print(f"[DEBUG] Document {id} NOT FOUND in DB")
        return jsonify({'error': f'Document {id} not found'}), 404
    print(f"[delete_document] Found doc ID: {id}, Owner: {doc.owner_id}")
    
    from app.models import User
    user = User.query.get(current_user_id)
    is_owner = doc.owner_id == current_user_id
    is_admin = user and user.role == 'admin' and user.workspace_id == doc.workspace_id
    
    if not is_owner and not is_admin:
        return jsonify({'error': 'Unauthorized'}), 403

    hard_delete = request.args.get('hard', 'false').lower() == 'true'
    
    if hard_delete:
        db.session.delete(doc)
        log_action(current_user_id, 'HARD_DELETE', 'document', id)
        db.session.commit()
        return jsonify({'message': 'Permanently deleted'}), 200
    else:
        doc.status = 'trashed'
        doc.updated_at = datetime.utcnow()
        log_action(current_user_id, 'TRASH', 'document', id)
        db.session.commit()
        return jsonify({'message': 'Moved to trash'}), 200

@documents_bp.route('/<int:id>/restore', methods=['POST'])
@jwt_required()
def restore_document(id):
    from app.models.document import Document
    current_user_id = int(get_jwt_identity())
    doc = Document.query.get_or_404(id)
    if doc.owner_id != current_user_id:
        from app.models import User
        user = User.query.get(current_user_id)
        if not (user and user.role == 'admin' and user.workspace_id == doc.workspace_id):
            return jsonify({'error': 'Unauthorized'}), 403
    doc.status = 'active'
    doc.updated_at = datetime.utcnow()
    log_action(current_user_id, 'RESTORE', 'document', id)
    db.session.commit()
    return jsonify({'message': 'Document restored'}), 200

@documents_bp.route('/<int:id>/permissions', methods=['GET'])
@jwt_required()
def get_doc_permissions(id):
    from app.models.document import Document, DocumentPermission
    current_user_id = int(get_jwt_identity())
    doc = Document.query.get_or_404(id)
    if doc.owner_id != current_user_id:
        from app.models import User
        user = User.query.get(current_user_id)
        if not (user and user.role == 'admin' and user.workspace_id == doc.workspace_id):
            return jsonify({'error': 'Unauthorized'}), 403
    perms = DocumentPermission.query.filter_by(document_id=id).all()
    return jsonify([p.to_dict() for p in perms]), 200

@documents_bp.route('/<int:id>/share', methods=['POST'])
@jwt_required()
def share_document(id):
    from app.models.document import Document, DocumentPermission
    from app.models import User
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    doc = Document.query.get_or_404(id)
    if doc.owner_id != current_user_id:
        if not (user and user.role == 'admin' and user.workspace_id == doc.workspace_id):
            return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    email = data.get('email')
    access_level = data.get('access_level', 'view')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    target_user = User.query.filter_by(email=email, workspace_id=user.workspace_id).first()
    if not target_user:
        return jsonify({'error': f'User with email {email} not found in this workspace.'}), 404
        
    existing = DocumentPermission.query.filter_by(document_id=id, user_id=target_user.id).first()
    if existing:
        existing.access_level = access_level
    else:
        new_perm = DocumentPermission(document_id=id, user_id=target_user.id, email=target_user.email, access_level=access_level)
        db.session.add(new_perm)
    
    db.session.commit()
    return jsonify({'message': f'Shared with {target_user.username}'}), 200
