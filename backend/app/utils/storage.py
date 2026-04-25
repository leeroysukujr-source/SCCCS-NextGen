import os
import logging
import boto3
from botocore.exceptions import ClientError
from flask import current_app

logger = logging.getLogger(__name__)

def get_s3_client():
    try:
        endpoint = current_app.config.get('S3_ENDPOINT')
        if endpoint:
            # 💡 DevOps Hardening: Ensure endpoint doesn't have trailing slashes
            # and supports both standard and supabase-specific formats
            endpoint = endpoint.rstrip('/')
            if 'supabase.co' in endpoint and '/storage/v1/s3' not in endpoint:
                # Append canonical S3 suffix if missing (prevents 403/404)
                if endpoint.endswith('/v1/s3'): pass
                elif endpoint.endswith('/v1'): endpoint += '/s3'
                else: endpoint += '/storage/v1/s3'
            
        access_key = current_app.config.get('S3_ACCESS_KEY')
        secret_key = current_app.config.get('S3_SECRET_KEY')
        region = current_app.config.get('S3_REGION')
        
        # If no endpoint, we can't do S3
        if not endpoint:
            return None

        from botocore.config import Config
        s3_config = Config(
            connect_timeout=5,
            read_timeout=5,
            retries={'max_attempts': 1}
        )
        
        session = boto3.session.Session()
        s3 = session.client(
            's3',
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region or 'us-east-1',
            config=s3_config
        )
        return s3
    except Exception as e:
        logger.error(f"Failed to initialize S3 client: {e}")
        return None



def ensure_bucket(bucket_name=None):
    """
    Point 2: Re-verify Bucket Existence (Post-Restoration Safety)
    Ensures the target bucket exists in the Supabase/S3 project.
    """
    bucket = bucket_name or current_app.config.get('S3_BUCKET')
    s3 = get_s3_client()
    if not s3:
        logger.warning(f"Could not initialize S3 client to verify bucket {bucket}")
        return False
        
    try:
        s3.head_bucket(Bucket=bucket)
        logger.info(f"✅ S3 Bucket '{bucket}' verified.")
        return True
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        if error_code == '404':
            try:
                logger.info(f"📦 Bucket '{bucket}' not found. Attempting auto-provisioning...")
                s3.create_bucket(Bucket=bucket)
                # Note: For Supabase, additional public access policy might be needed via SQL
                # But creation is the first step.
                logger.info(f"✅ Created bucket '{bucket}'.")
                return True
            except Exception as create_err:
                logger.error(f"Failed to auto-create bucket {bucket}: {create_err}")
                return False
        logger.error(f"S3 Head Bucket Error ({error_code}): {e}")
        return False
    except Exception as e:
        logger.exception('Failed to verify bucket %s: %s', bucket, str(e))
        return False


def upload_fileobj(fileobj, key, bucket=None, extra_args=None):
    bucket = bucket or current_app.config.get('S3_BUCKET')
    s3 = get_s3_client()
    if not s3:
        logger.warning("Skipping S3 upload: client not initialized")
        return False
        
    try:
        s3.upload_fileobj(fileobj, bucket, key, ExtraArgs=extra_args or {})
        return True
    except Exception as e:
        logger.exception('S3 upload failed: %s', str(e))
        return False



def generate_presigned_url(key, bucket=None, expires_in=3600):
    bucket = bucket or current_app.config.get('S3_BUCKET')
    s3 = get_s3_client()
    try:
        return s3.generate_presigned_url('get_object', Params={'Bucket': bucket, 'Key': key}, ExpiresIn=expires_in)
    except Exception as e:
        logger.exception('Failed to generate presigned URL: %s', str(e))
        return None


def get_public_url(key, bucket=None):
    """
    Generate a public URL for a given key.
    If using Supabase S3, it transforms the S3 endpoint to a public URL.
    """
    bucket = bucket or current_app.config.get('S3_BUCKET')
    endpoint = current_app.config.get('S3_ENDPOINT')
    
    if not endpoint:
        return None
        
    # Handle Supabase S3 endpoint conversion
    if 'supabase.co' in endpoint and '/storage/v1/s3' in endpoint:
        # From: https://[id].supabase.co/storage/v1/s3
        # To:   https://[id].supabase.co/storage/v1/object/public/[bucket]/[key]
        base_url = endpoint.replace('/storage/v1/s3', '')
        return f"{base_url}/storage/v1/object/public/{bucket}/{key}"
        
    # Default S3-style public URL (if public access is enabled on bucket)
    return f"{endpoint}/{bucket}/{key}"

