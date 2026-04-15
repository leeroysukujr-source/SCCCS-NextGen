import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_logo(file, folder='logos'):
    """
    Saves an uploaded logo file and returns the URL.
    Uses S3 cloud storage if configured, otherwise falls back to local storage.
    """
    import logging
    logger = logging.getLogger(__name__)

    if not file or file.filename == '':
        logger.warning("save_logo called with empty file")
        return None
    
    if not allowed_file(file.filename):
        logger.warning(f"File type not allowed for {file.filename}")
        return None

    try:
        filename = secure_filename(file.filename)
        ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else 'png'
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        key = f"{folder}/{unique_filename}" if folder else unique_filename
        
        logger.info(f"Attempting to save logo: {unique_filename} to folder: {folder}")
        
        # Check if S3 is configured
        from app.utils.storage import upload_fileobj, get_public_url
        
        s3_endpoint = current_app.config.get('S3_ENDPOINT')
        s3_bucket = current_app.config.get('S3_BUCKET')
        
        # S3 Storage Path
        if s3_endpoint and s3_bucket and 'localhost' not in s3_endpoint:
            logger.info(f"S3 detected: {s3_endpoint}. Attempting S3 upload.")
            # Reset file pointer to beginning before uploading
            file.seek(0)
            try:
                success = upload_fileobj(file, key)
                if success:
                    url = get_public_url(key)
                    logger.info(f"Successfully uploaded logo to S3: {url}")
                    return url
                else:
                    logger.error(f"S3 upload failed for {key}")
            except Exception as s3_err:
                logger.error(f"S3 upload exception: {str(s3_err)}")
                
        # Fallback: Local file system
        logger.info("Falling back to local storage for logo")
        
        # Use current_app.root_path which is guaranteed to be the 'app' directory
        # backend/app -> parent -> backend
        backend_dir = os.path.dirname(current_app.root_path)
        upload_base = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        
        # Ensure we use an absolute path
        if not os.path.isabs(upload_base):
            upload_path = os.path.join(backend_dir, upload_base, folder)
        else:
            upload_path = os.path.join(upload_base, folder)
        
        logger.info(f"Standardized local upload_path: {upload_path}")
        
        try:
            if not os.path.exists(upload_path):
                logger.info(f"Creating directory: {upload_path}")
                os.makedirs(upload_path, exist_ok=True)
            
            # Save locally
            file.seek(0)
            target_path = os.path.join(upload_path, unique_filename)
            logger.info(f"Attempting file.save to: {target_path}")
            file.save(target_path)
            
            if os.path.exists(target_path):
                logger.info(f"Saved logo successfully to {target_path}")
                # Return relative URL that files.py can serve via the /serve/ route
                return f"/api/files/serve/{folder}/{unique_filename}"
            else:
                logger.error(f"File.save() reported no error but file missing at {target_path}")
                # Try a last-ditch effort: save to /app/uploads if backend/uploads is restricted
                app_upload_path = os.path.join(current_app.root_path, 'uploads', folder)
                os.makedirs(app_upload_path, exist_ok=True)
                target_path = os.path.join(app_upload_path, unique_filename)
                file.seek(0)
                file.save(target_path)
                if os.path.exists(target_path):
                    logger.info(f"Saved logo to contingency path: {target_path}")
                    return f"/api/files/serve/{folder}/{unique_filename}"
                return None
        except Exception as local_err:
            logger.error(f"Local save failed: {str(local_err)}")
            # Try /tmp as absolute last resort (won't be servable normally but prevents 500)
            try:
                # On linux /tmp is always writable
                tmp_dir = '/tmp/scccs-uploads'
                os.makedirs(tmp_dir, exist_ok=True)
                tmp_path = os.path.join(tmp_dir, unique_filename)
                file.seek(0)
                file.save(tmp_path)
                logger.warning(f"Saved logo to /tmp last resort: {tmp_path}")
                # NOTE: We return the serve URL anyway, we might need a custom route to serve from /tmp
                return f"/api/files/serve/{folder}/{unique_filename}" 
            except Exception as tmp_err:
                logger.error(f"Last resort /tmp also failed: {str(tmp_err)}")
                return None

            
    except Exception as e:
        logger.exception(f"Unexpected error in save_logo: {str(e)}")
        return None



