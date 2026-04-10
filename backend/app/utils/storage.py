import os
import logging
import boto3
from botocore.exceptions import ClientError
from flask import current_app

logger = logging.getLogger(__name__)

def get_s3_client():
    endpoint = current_app.config.get('S3_ENDPOINT')
    access_key = current_app.config.get('S3_ACCESS_KEY')
    secret_key = current_app.config.get('S3_SECRET_KEY')
    # Use unsigned or specific config if needed
    session = boto3.session.Session()
    s3 = session.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
    )
    return s3


def ensure_bucket(bucket_name=None):
    bucket = bucket_name or current_app.config.get('S3_BUCKET')
    s3 = get_s3_client()
    try:
        s3.head_bucket(Bucket=bucket)
        return True
    except ClientError:
        try:
            s3.create_bucket(Bucket=bucket)
            return True
        except Exception as e:
            logger.exception('Failed to create bucket %s: %s', bucket, str(e))
            return False


def upload_fileobj(fileobj, key, bucket=None, extra_args=None):
    bucket = bucket or current_app.config.get('S3_BUCKET')
    s3 = get_s3_client()
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

