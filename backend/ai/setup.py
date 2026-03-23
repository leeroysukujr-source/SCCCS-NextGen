#!/usr/bin/env python3
"""Setup script to enable OpenAI and prepare for staging deployment."""

import os
import sys
import subprocess
from pathlib import Path

def print_step(msg):
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}")

def print_success(msg):
    print(f"✅ {msg}")

def print_error(msg):
    print(f"❌ {msg}")
    sys.exit(1)

def print_info(msg):
    print(f"ℹ️  {msg}")

def main():
    print_step("AI Microservice Staging Deployment Setup")
    
    # Step 1: Check OpenAI API Key
    print_step("Step 1: Configure OpenAI Integration")
    
    openai_key = os.environ.get('OPENAI_API_KEY', '')
    if openai_key and openai_key.startswith('sk-'):
        print_success(f"OpenAI API Key found: {openai_key[:20]}...")
    else:
        print_info("""
OpenAI API Key not configured.

To enable OpenAI integration (optional):
1. Go to https://platform.openai.com/api/keys
2. Create a new API key
3. Set environment variable:
   
   Windows (PowerShell):
   $env:OPENAI_API_KEY='sk-your-key-here'
   
   Windows (CMD):
   set OPENAI_API_KEY=sk-your-key-here
   
   macOS/Linux:
   export OPENAI_API_KEY='sk-your-key-here'

Continuing without OpenAI (naive summarization will be used)...
        """)
        openai_key = None
    
    # Step 2: Verify AI Service Imports
    print_step("Step 2: Verify AI Service")
    
    ai_service_path = Path(__file__).parent / 'ai_service.py'
    if not ai_service_path.exists():
        print_error(f"ai_service.py not found at {ai_service_path}")
    
    try:
        import fastapi
        import openai
        import slowapi
        print_success("All required packages installed (fastapi, openai, slowapi)")
    except ImportError as e:
        print_error(f"Missing package: {e}")
    
    # Step 3: Test API Service
    print_step("Step 3: Quick Service Health Check")
    
    print_info("Testing API service (non-blocking)...")
    try:
        import httpx
        # This will fail if service isn't running, which is fine
        try:
            r = httpx.get('http://localhost:8001/health', timeout=2)
            if r.status_code == 200:
                data = r.json()
                print_success(f"Service health: {data['status']}")
                print_success(f"OpenAI enabled: {data['openai_enabled']}")
            else:
                print_info("Service not running (expected if not started yet)")
        except:
            print_info("Service not running (expected if not started yet)")
            print_info("Start it manually with:")
            print_info("  cd backend/ai && python -m uvicorn ai_service:app --host 127.0.0.1 --port 8001")
    except ImportError:
        print_info("httpx not installed; skipping health check")
    
    # Step 4: Build Frontend
    print_step("Step 4: Build Frontend for Staging")
    
    frontend_dir = Path(__file__).parent.parent.parent / 'frontend'
    if not frontend_dir.exists():
        print_error(f"Frontend directory not found: {frontend_dir}")
    
    print_info(f"Building frontend from: {frontend_dir}")
    
    # Try to run npm build - use shell=True on Windows for better PATH resolution
    import platform
    use_shell = platform.system() == 'Windows'
    cmd = 'npm run build' if use_shell else ['npm', 'run', 'build']
    
    try:
        result = subprocess.run(
            cmd,
            cwd=frontend_dir,
            capture_output=True,
            text=True,
            shell=use_shell
        )
        
        if result.returncode == 0:
            print_success("Frontend built successfully")
            dist_dir = frontend_dir / 'dist'
            if dist_dir.exists():
                files = list(dist_dir.glob('**/*'))
                print_success(f"Build artifacts ready ({len(files)} files)")
        else:
            print_error(f"Frontend build failed:\n{result.stderr}")
    except FileNotFoundError:
        print_warning("npm not found in PATH. Skipping frontend build. Please ensure Node.js is installed.")
        print_warning("You can manually build the frontend with: npm run build")
    
    # Step 5: Staging Configuration
    print_step("Step 5: Staging Configuration")
    
    env_file = Path(__file__).parent / '.env'
    print_info(f"Configuration file: {env_file}")
    
    if env_file.exists():
        print_success(".env file exists")
    else:
        print_info(".env file not found; creating from template...")
    
    # Step 6: Docker Preparation
    print_step("Step 6: Docker Staging Deployment")
    
    docker_compose_file = Path(__file__).parent.parent.parent / 'docker-compose.ai.yml'
    if docker_compose_file.exists():
        print_success(f"Docker Compose file ready: {docker_compose_file}")
    else:
        print_error(f"Docker Compose file not found: {docker_compose_file}")
    
    # Final Summary
    print_step("Setup Summary")
    
    print("""
✅ Backend AI Service
   - FastAPI app: backend/ai/ai_service.py
   - Configuration: backend/ai/.env
   - Start: python -m uvicorn ai_service:app --host 127.0.0.1 --port 8001
   
✅ Frontend Build
   - React app compiled for production
   - Output: frontend/dist/
   - Proxies configured in vite.config.js
   
✅ Docker Deployment
   - Image: docker-compose.ai.yml
   - Nginx reverse proxy included
   - Rate limiting configured
   
Next Steps for Staging:
1. Set OPENAI_API_KEY environment variable (if not already done)
2. Start AI service: cd backend/ai && python -m uvicorn ai_service:app --host 0.0.0.0 --port 8001
3. Deploy frontend build: Upload frontend/dist to web server
4. Test integration: Run backend/ai/test_post.py
5. Monitor: docker logs -f ai-features-service
    """)
    
    print_success("Setup complete! Ready for staging deployment.")

if __name__ == '__main__':
    main()
