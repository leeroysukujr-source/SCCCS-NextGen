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
