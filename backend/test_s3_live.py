import os
import boto3
from botocore.config import Config
from dotenv import load_dotenv

load_dotenv()

def test_s3_connection():
    print("--- S3 Connectivity Test ---")
    endpoint = os.getenv('S3_ENDPOINT')
    access_key = os.getenv('S3_ACCESS_KEY')
    secret_key = os.getenv('S3_SECRET_KEY')
    bucket = os.getenv('S3_BUCKET')
    
    print(f"Endpoint: {endpoint}")
    print(f"Bucket: {bucket}")
    print(f"Access Key: {access_key[:5]}...{access_key[-5:] if access_key else ''}")
    
    if not all([endpoint, access_key, secret_key, bucket]):
        print("❌ Error: Missing S3 environment variables")
        return

    try:
        s3 = boto3.client(
            's3',
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name='us-east-1', # Supabase/MinIO standard
            config=Config(signature_version='s3v4')
        )
        
        print("\nAttempting to list buckets...")
        response = s3.list_buckets()
        print("✅ Success! Buckets found:")
        for b in response.get('Buckets', []):
            print(f" - {b['Name']}")
            
        print(f"\nChecking if bucket '{bucket}' exists...")
        try:
            s3.head_bucket(Bucket=bucket)
            print(f"✅ Bucket '{bucket}' exists and is accessible.")
        except Exception as e:
            print(f"⚠️ Bucket '{bucket}' not found or not accessible. Error: {e}")
            print(f"Attempting to create bucket '{bucket}'...")
            s3.create_bucket(Bucket=bucket)
            print(f"✅ Created bucket '{bucket}'.")

        print("\nAttempting to upload a test file...")
        test_content = b"Connectivity test content"
        s3.put_object(Bucket=bucket, Key="test_connection.txt", Body=test_content)
        print("✅ Test file uploaded successfully.")

    except Exception as e:
        print(f"❌ S3 Connection Failed: {e}")

if __name__ == "__main__":
    test_s3_connection()
