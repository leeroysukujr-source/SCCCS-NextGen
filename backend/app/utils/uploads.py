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
    Saves an uploaded logo file and returns the relative URL.
    """
    if not file or file.filename == '':
        return None
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add uuid to prevent collisions
        ext = filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        
        # Absolute path to save
        upload_path = os.path.join(current_app.root_path, 'static', 'uploads', folder)
        os.makedirs(upload_path, exist_ok=True)
        
        file.save(os.path.join(upload_path, unique_filename))
        
        # Return relative URL
        return f"/static/uploads/{folder}/{unique_filename}"
    
    return None
