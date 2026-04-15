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
        
        # 1. Define candidate directories
        bases = []
        try:
            bases.append(os.path.dirname(current_app.root_path))
        except:
            pass
        bases.append(os.getcwd())
        bases.append('/app')
        
        candidates = []
        for base in bases:
            candidates.append(os.path.join(base, current_app.config.get('UPLOAD_FOLDER', 'uploads'), folder))
            candidates.append(os.path.join(base, 'uploads', folder))
            candidates.append(os.path.join(base, 'app', 'static', 'uploads', folder))
            
        # Deduplicate and add absolute paths
        candidates = list(dict.fromkeys(candidates))
        candidates.append(os.path.join('/tmp', 'scccs-uploads', folder))
        
        for upload_path in candidates:
            logger.info(f"Targeting upload path candidate: {upload_path}")
            try:
                # Ensure the directory exists
                if not os.path.exists(upload_path):
                    os.makedirs(upload_path, exist_ok=True)
                
                target_path = os.path.join(upload_path, unique_filename)
                
                # Reset file for new attempt
                file.seek(0)
                file.save(target_path)
                
                if os.path.exists(target_path):
                    logger.info(f"Saved logo successfully to {target_path}")
                    
                    # Construct URL based on where it was saved
                    if 'static' in upload_path:
                        # Served via /static/ directly
                        return f"/static/uploads/{folder}/{unique_filename}"
                    elif '/tmp' in upload_path:
                        # Will need special handling or might fail to serve, but we prevent 500
                        return f"/api/files/serve/{folder}/{unique_filename}"
                    else:
                        # Served via /api/files/serve/ route
                        return f"/api/files/serve/{folder}/{unique_filename}"
            except Exception as e:
                logger.warning(f"Failed to save to {upload_path}: {str(e)}")
                continue
                
        logger.error("All local upload candidates failed")
        return None
            
    except Exception as e:
        logger.exception(f"Unexpected error in save_logo: {str(e)}")
        return None




