import os
import uuid
import logging
from werkzeug.utils import secure_filename
from flask import current_app
from app.utils.storage import upload_fileobj, get_public_url

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_logo(file, folder='logos'):
    """
    Saves an uploaded logo file and returns the URL.
    Uses S3 cloud storage if configured, otherwise falls back to local storage.
    """
    if not file:
        logger.error("save_logo called with None file object")
        return None
        
    filename = getattr(file, 'filename', '')
    if not filename:
        logger.warning("save_logo called with file having no filename")
        return None
    
    if not allowed_file(filename):
        logger.warning(f"File type not allowed for {filename}")
        return None

    try:
        logger.debug(f"Starting logo save process for {filename}")
        safe_filename = secure_filename(filename)
        ext = safe_filename.rsplit('.', 1)[1].lower() if '.' in safe_filename else 'png'
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        key = f"{folder}/{unique_filename}" if folder else unique_filename
        
        logger.info(f"Target key: {key}")
        
        # Check if S3 is configured
        s3_endpoint = current_app.config.get('S3_ENDPOINT')
        s3_bucket = current_app.config.get('S3_BUCKET')
        
        # S3 Storage Path
        if s3_endpoint and s3_bucket and 'localhost' not in s3_endpoint:
            logger.info(f"S3 target detected: {s3_endpoint}/{s3_bucket}")
            file.seek(0)
            try:
                success = upload_fileobj(file, key)
                if success:
                    url = get_public_url(key)
                    logger.info(f"S3 storage success: {url}")
                    return url
                else:
                    logger.warning("S3 upload_fileobj returned False, falling back to local")
            except Exception as s3_err:
                logger.error(f"S3 upload crashed: {str(s3_err)}")
                
        # Fallback: Local file system
        logger.info("Initializing local file system candidates...")
        
        # 1. Define candidate directories
        bases = []
        try:
            bases.append(os.path.dirname(current_app.root_path))
        except Exception as e:
            logger.debug(f"root_path not available: {e}")
            
        bases.append(os.getcwd())
        if os.name != 'nt': # Don't add /app on Windows
            bases.append('/app')
        
        candidates = []
        for base in bases:
            try:
                candidates.append(os.path.join(base, current_app.config.get('UPLOAD_FOLDER', 'uploads'), folder))
                candidates.append(os.path.join(base, 'uploads', folder))
                candidates.append(os.path.join(base, 'app', 'static', 'uploads', folder))
            except Exception as e:
                logger.debug(f"Error building candidates for {base}: {e}")
            
        # Deduplicate and add tmp
        candidates = list(dict.fromkeys(candidates))
        if os.name != 'nt':
            candidates.append(os.path.join('/tmp', 'scccs-uploads', folder))
        
        logger.info(f"Total candidates to test: {len(candidates)}")
        
        for upload_path in candidates:
            try:
                logger.debug(f"Testing candidate: {upload_path}")
                if not os.path.exists(upload_path):
                    os.makedirs(upload_path, exist_ok=True)
                
                target_path = os.path.join(upload_path, unique_filename)
                
                # Reset file for new attempt
                file.seek(0)
                file.save(target_path)
                
                if os.path.exists(target_path):
                    logger.info(f"SUCCESS: Saved logo to {target_path}")
                    
                    # Construct URL based on where it was saved
                    if 'static' in upload_path:
                        return f"/static/uploads/{folder}/{unique_filename}"
                    elif '/tmp' in upload_path:
                        return f"/api/files/serve/{folder}/{unique_filename}"
                    else:
                        return f"/api/files/serve/{folder}/{unique_filename}"
            except Exception as e:
                logger.warning(f"Candidate {upload_path} failed: {str(e)}")
                continue
                
        logger.error("FATAL: Exhausted all 10+ local storage candidates. Permissions issue likely.")
        return None
            
    except Exception as e:
        logger.exception(f"CRITICAL failure in save_logo root: {str(e)}")
        return None




