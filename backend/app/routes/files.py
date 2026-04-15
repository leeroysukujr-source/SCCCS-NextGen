from flask import Blueprint, request, jsonify, send_file, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import File, User, Channel, Message
from app.utils.encryption import encrypt_file_data, decrypt_file_data
from app.utils.channel_privacy import can_access_channel
import os
from werkzeug.utils import secure_filename
from datetime import datetime
import mimetypes
from io import BytesIO

files_bp = Blueprint('files', __name__)

UPLOAD_FOLDER = 'uploads'
# Support all file types including audio, video, and documents
ALLOWED_EXTENSIONS = {
    # Documents
    'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp',
    # Images
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'ico',
    # Audio
    'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma', 'opus',
    # Video
    'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp',
    # Archives
    'zip', 'rar', '7z', 'tar', 'gz',
    # Other
    'csv', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'cpp', 'c'
}

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@files_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    try:
        current_user_id = get_jwt_identity()
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        unique_filename = timestamp + filename
        
        # Use absolute path relative to this file
        current_file_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(os.path.dirname(current_file_dir))
        upload_folder = os.path.join(backend_dir, UPLOAD_FOLDER)
        
        file_path = os.path.join(upload_folder, unique_filename)
        
        # Ensure upload directory exists
        os.makedirs(upload_folder, exist_ok=True)
        
        # Get MIME type with better audio format detection
        mime_type, _ = mimetypes.guess_type(filename)
        
        # Map audio extensions to proper MIME types
        file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
        audio_mime_types = {
            'webm': 'audio/webm',
            'ogg': 'audio/ogg',
            'mp3': 'audio/mpeg',
            'mp4': 'audio/mp4',
            'm4a': 'audio/mp4',
            'wav': 'audio/wav',
            'aac': 'audio/aac',
            'flac': 'audio/flac',
            'opus': 'audio/opus'
        }
        
        if file_ext in audio_mime_types:
            mime_type = audio_mime_types[file_ext]
        elif not mime_type:
            mime_type = 'application/octet-stream'
        
        # Read file data
        file_data = file.read()
        file_size = len(file_data)
        
        # Check if encryption is needed (from channel if message_id provided)
        is_encrypted = False
        channel_id = request.form.get('channel_id', type=int)
        lesson_id = request.form.get('lesson_id', type=int)
        
        if channel_id:
            channel = Channel.query.get(channel_id)
            if channel and channel.is_encrypted and channel.encryption_key:
                try:
                    encryption_key = channel.encryption_key.encode('utf-8')
                    file_data = encrypt_file_data(file_data, encryption_key)
                    is_encrypted = True
                except Exception as e:
                    print(f"[Upload] Encryption failed: {str(e)}")
                    # File encryption failed - continue without encryption
                    pass
        
        # Cloud Storage Logic
        storage_url = None
        from app.utils.storage import upload_fileobj, get_public_url
        from flask import current_app
        
        if current_app.config.get('S3_ENDPOINT') and current_app.config.get('S3_BUCKET') and 'localhost' not in current_app.config.get('S3_ENDPOINT'):
            # Upload to S3
            file_stream = BytesIO(file_data)
            folder = 'files'
            if lesson_id: folder = 'materials'
            elif channel_id: folder = f'channels/{channel_id}'
            
            key = f"{folder}/{unique_filename}"
            try:
                if upload_fileobj(file_stream, key):
                    storage_url = get_public_url(key)
                    file_path = storage_url
                    print(f"[Upload] Successfully uploaded to cloud: {storage_url}")
            except Exception as e:
                print(f"[Upload] Cloud storage upload failed: {str(e)}")
                # Error will fallback to local save if not uploaded to cloud

        # Fallback to Local Save if not uploaded to cloud
        if not storage_url:
            print(f"[Upload] Saving locally to: {file_path}")
            with open(file_path, 'wb') as f:
                f.write(file_data)
        
        # Get current user
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if lesson_id:
            # Verify user has permission to upload to this lesson
            from app.models import Lesson, Class, ClassMember
            lesson = Lesson.query.get(lesson_id)
            if not lesson:
                return jsonify({'error': 'Lesson not found'}), 404
            
            # Check if user is teacher/admin or member of the class
            class_obj = Class.query.get(lesson.class_id)
            if not class_obj:
                return jsonify({'error': 'Class not found'}), 404
            
            member = ClassMember.query.filter_by(class_id=lesson.class_id, user_id=current_user_id).first()
            
            # Only teachers/admins can upload course materials
            if not (user.role in ['admin', 'teacher'] or class_obj.teacher_id == current_user_id or (member and member.role in ['teacher', 'ta'])):
                return jsonify({'error': 'Only teachers can upload course materials'}), 403
        
        file_obj = File(
            filename=unique_filename,
            original_filename=filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=mime_type,
            uploaded_by=current_user_id,
            message_id=request.form.get('message_id', type=int),
            lesson_id=lesson_id,
            group_id=request.form.get('group_id', type=int),
            workspace_id=user.workspace_id if user.workspace_id else None
        )
        
        db.session.add(file_obj)
        db.session.commit()
        
        return jsonify(file_obj.to_dict()), 201
        
    except Exception as e:
        import traceback
        import sys
        print(f"!!! CRITICAL UPLOAD ERROR: {str(e)}", file=sys.stderr)
        traceback.print_exc()
        return jsonify({'error': str(e), 'details': 'Critical internal server error during file upload'}), 500

from flask_cors import cross_origin

@files_bp.route('/avatar/<filename>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_avatar(filename):
    """Serve avatar images - PUBLIC ACCESS"""
    from flask import send_from_directory
    
    # Robustly find the uploads/avatars directory relative to this file
    # This file is in app/routes/files.py
    # We want backend/uploads/avatars
    current_file_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(current_file_dir))
    avatars_folder = os.path.join(backend_dir, 'uploads', 'avatars')
    
    file_path = os.path.join(avatars_folder, filename)
    
    if not os.path.exists(file_path):
        return jsonify({'error': 'Avatar not found', 'path_checked': avatars_folder}), 404
        
    return send_from_directory(avatars_folder, filename)

@files_bp.route('/system/<filename>', methods=['GET'])
@cross_origin()
def get_system_file(filename):
    """Serve system assets (logos, etc) - PUBLIC ACCESS"""
    from flask import send_from_directory
    
    current_file_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(current_file_dir))
    system_folder = os.path.join(backend_dir, 'uploads', 'system')
    
    if not os.path.exists(os.path.join(system_folder, filename)):
        return jsonify({'error': 'File not found'}), 404
        
    return send_from_directory(system_folder, filename)

@files_bp.route('/serve/<path:filepath>', methods=['GET'])
@cross_origin()
def get_uploaded_file(filepath):
    """Generic route to serve any file from uploads directory - PUBLIC ACCESS"""
    from flask import send_from_directory
    
    current_file_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(current_file_dir))
    uploads_folder = os.path.join(backend_dir, 'uploads')
    
    # Secure the filepath to prevent path traversal
    # Note: flask's send_from_directory handles some of this
    try:
        if os.path.exists(os.path.join(uploads_folder, filepath)):
            return send_from_directory(uploads_folder, filepath)
            
        # Try internal app uploads folder
        app_uploads = os.path.join(current_app.root_path, 'uploads')
        if os.path.exists(os.path.join(app_uploads, filepath)):
            return send_from_directory(app_uploads, filepath)

        # Last resort fallback: Check /tmp/scccs-uploads
        tmp_folder = '/tmp/scccs-uploads'
        if os.path.exists(os.path.join(tmp_folder, filepath)):
            return send_from_directory(tmp_folder, filepath)
            
        return jsonify({'error': 'File not found', 'checked': [uploads_folder, app_uploads, tmp_folder]}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@files_bp.route('/<int:file_id>', methods=['GET'])
def get_file(file_id):
    # Support token in query params for media elements (audio/video/img)
    token = request.args.get('token')
    if token:
        from flask_jwt_extended import decode_token
        try:
            # Manually decode and set identity if token provided in URL
            decoded = decode_token(token)
            current_user_id = decoded['sub']
        except Exception:
            return jsonify({'error': 'Invalid token in URL'}), 401
    else:
        # Fallback to standard JWT requirement
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
        except Exception:
            return jsonify({'error': 'Authentication required'}), 401
    
    file_obj = File.query.get(file_id)
    
    if not file_obj:
        print(f"DEBUG ERROR: File ID {file_id} not found in database")
        return jsonify({'error': 'File not found'}), 404
    
    print(f"DEBUG: Processing file ID {file_id}: {file_obj.original_filename}")
    print(f"DEBUG: Stored file_path: {file_obj.file_path}")
    
    # Check privacy if file is associated with a message/channel
    if file_obj.message_id:
        message = Message.query.get(file_obj.message_id)
        if message:
            channel = Channel.query.get(message.channel_id)
            if channel and not can_access_channel(current_user_id, channel.id):
                print(f"DEBUG: Access denied for user {current_user_id} to file {file_id}")
                return jsonify({'error': 'Access denied'}), 403
    
    real_file_path = file_obj.file_path
    file_data = None
    
    # Handle Cloud Storage vs Local Storage
    if real_file_path.startswith('http'):
        import requests
        print(f"DEBUG: Fetching cloud file: {real_file_path}")
        try:
            # If the file is NOT encrypted and no special processing is needed, we COULD redirect.
            # However, for consistency with the rest of the logic (encryption, mime types),
            # we fetch it to the server first.
            response = requests.get(real_file_path, timeout=10)
            if response.status_code == 200:
                file_data = response.content
                print(f"DEBUG: Successfully fetched {len(file_data)} bytes from cloud")
            else:
                print(f"DEBUG ERROR: Cloud storage returned {response.status_code} for {real_file_path}")
                return jsonify({'error': 'Failed to fetch file from cloud storage', 'status': response.status_code}), 500
        except Exception as e:
            print(f"DEBUG ERROR Fetching Cloud: {str(e)}")
            return jsonify({'error': f'Cloud storage access error: {str(e)}'}), 500
    else:
        # Handle relative paths (legacy) by making them absolute relative to backend root
        if not os.path.isabs(real_file_path):
            current_file_dir = os.path.dirname(os.path.abspath(__file__))
            backend_dir = os.path.dirname(os.path.dirname(current_file_dir))
            real_file_path = os.path.join(backend_dir, real_file_path)
        
        print(f"DEBUG: Checking local path: {real_file_path}")
        if not os.path.exists(real_file_path):
            print(f"DEBUG ERROR: Local file missing at {real_file_path}")
            return jsonify({
                'error': 'File not found on server', 
                'path': real_file_path,
                'is_render': 'RENDER' in os.environ
            }), 404
        
        # Read local file
        try:
            with open(real_file_path, 'rb') as f:
                file_data = f.read()
            print(f"DEBUG: Successfully read {len(file_data)} bytes from local storage")
        except Exception as e:
            print(f"DEBUG ERROR Reading Local: {str(e)}")
            return jsonify({'error': f'Local file access error: {str(e)}'}), 500
    
    # Check if file is encrypted (from channel)
    if file_obj.message_id:
        message = Message.query.get(file_obj.message_id)
        if message:
            channel = Channel.query.get(message.channel_id)
            if channel and channel.encryption_key:
                try:
                    encryption_key = channel.encryption_key.encode('utf-8')
                    file_data = decrypt_file_data(file_data, encryption_key)
                except Exception:
                    # File decryption failed - continue
                    pass

    
    # Check if download is requested (for forced download)
    force_download = request.args.get('download', 'false').lower() == 'true'
    
    # Determine if file should be served inline (for media playback) or as attachment (for download)
    # Media files (audio/video) should be served inline when not downloading
    # Ensure strict MIME types for Office/PDF to trigger correct OS/Browser handling
    mime_type = file_obj.mime_type
    filename = file_obj.original_filename or 'file'
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    if ext == 'pdf': mime_type = 'application/pdf'
    elif ext == 'doc': mime_type = 'application/msword'
    elif ext == 'docx': mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    elif ext == 'xls': mime_type = 'application/vnd.ms-excel'
    elif ext == 'xlsx': mime_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    elif ext == 'ppt': mime_type = 'application/vnd.ms-powerpoint'
    elif ext == 'pptx': mime_type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

    # Determine if file should be served inline 
    # Serving Office docs as inline allows browsers with plugins to view them, 
    # otherwise they naturally fallback to download/open
    is_viewable = mime_type and (
        mime_type.startswith('audio/') or 
        mime_type.startswith('video/') or
        mime_type.startswith('image/') or
        mime_type == 'application/pdf' or
        mime_type.startswith('text/') or
        'word' in mime_type or 'excel' in mime_type or 'powerpoint' in mime_type or
        'spreadsheet' in mime_type or 'presentation' in mime_type
    )
    
    as_attachment = force_download or not is_viewable
    
    # Use BytesIO to send file data directly without creating temporary files
    file_stream = BytesIO(file_data)
    
    return send_file(
        file_stream,
        as_attachment=as_attachment,
        download_name=file_obj.original_filename,
        mimetype=mime_type or 'application/octet-stream'
    )

@files_bp.route('/<int:file_id>', methods=['DELETE'])
@jwt_required()
def delete_file(file_id):
    current_user_id = get_jwt_identity()
    file_obj = File.query.get(file_id)
    
    if not file_obj:
        return jsonify({'error': 'File not found'}), 404
    
    # Check permission
    if file_obj.uploaded_by != current_user_id:
        user = User.query.get(current_user_id)
        if user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
    
    # Delete file from filesystem
    if os.path.exists(file_obj.file_path):
        os.remove(file_obj.file_path)
    
    db.session.delete(file_obj)
    db.session.commit()
    
    return jsonify({'message': 'File deleted'}), 200

@files_bp.route('/info/<int:file_id>', methods=['GET'])
@jwt_required()
def get_file_info(file_id):
    file_obj = File.query.get(file_id)
    
    if not file_obj:
        return jsonify({'error': 'File not found'}), 404
    
    return jsonify(file_obj.to_dict()), 200

@files_bp.route('/group/<int:group_id>', methods=['GET'])
@jwt_required()
def get_group_files(group_id):
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # Check if group is an AssignmentGroup or StudyGroup and if user is a member
        from app.models import AssignmentGroup, GroupMember
        
        # Check if user is admin/super_admin
        is_admin = user and user.role in ['admin', 'super_admin']
        
        if not is_admin:
            # Check AssignmentGroup membership
            assignment_group = AssignmentGroup.query.get(group_id)
            is_member = False
            
            if assignment_group:
                from app.models import AssignmentGroupMember, Assignment
                # Check if user is a member or the creator of the assignment (teacher)
                assignment = Assignment.query.get(assignment_group.assignment_id)
                is_member = AssignmentGroupMember.query.filter_by(
                    group_id=group_id, user_id=current_user_id
                ).first() is not None or (assignment and assignment.created_by == current_user_id)
            else:
                # Check regular StudyGroup membership
                is_member = GroupMember.query.filter_by(
                    group_id=group_id, user_id=current_user_id
                ).first() is not None
                
            if not is_member:
                return jsonify({'error': 'Unauthorized. Not a member of this group.'}), 403

        files = File.query.filter_by(group_id=group_id).order_by(File.created_at.desc()).all()
        return jsonify([f.to_dict() for f in files])
    except Exception as e:
        import traceback
        import sys
        print(f"ERROR in get_group_files: {str(e)}", file=sys.stderr)
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
