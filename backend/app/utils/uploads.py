import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'svg'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_logo(file, folder='logos'):
    """
    Saves an uploaded logo file and returns the URL.
    Uses S3 cloud storage if configured, otherwise falls back to local storage.
    """
    if not file or file.filename == '':
        return None
    
    if not allowed_file(file.filename):
        return None

    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    key = f"{folder}/{unique_filename}" if folder else unique_filename
    
    # Check if S3 is configured
    from app.utils.storage import upload_fileobj, get_public_url
    
    # S3 Storage Path
    if current_app.config.get('S3_ENDPOINT') and current_app.config.get('S3_BUCKET'):
        # Reset file pointer to beginning before uploading
        file.seek(0)
        success = upload_fileobj(file, key)
        if success:
            return get_public_url(key)
            
    # Fallback: Local file system
    # Absolute path to save
    upload_path = os.path.join(current_app.root_path, 'static', 'uploads', folder)
    os.makedirs(upload_path, exist_ok=True)
    
    # Save locally
    file.seek(0)
    file.save(os.path.join(upload_path, unique_filename))
    
    # Return relative URL
    return f"/static/uploads/{folder}/{unique_filename}"

