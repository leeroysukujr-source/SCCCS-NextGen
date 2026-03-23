#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')
try:
    from ai_service import app
    print('✓ Service imports successfully')
    print('✓ FastAPI app loaded')
    print('✓ All dependencies available')
    print(f'✓ Service name: {app.title}')
except ImportError as e:
    print(f'✗ Import error: {e}')
    sys.exit(1)
except Exception as e:
    print(f'✗ Error: {e}')
    sys.exit(1)
