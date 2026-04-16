import os
from flask import current_app

def ensure_system_dirs():
    """
    Force System Directory & Permissions
    Instruction: explicitly ensure the system branding directory exists and has global write permissions 
    for the Flask process.
    """
    try:
        # Use absolute path from current app static folder if available
        # Fallback to local 'static' folder if not
        static_folder = current_app.static_folder or os.path.join(current_app.root_path, 'static')
        system_logo_path = os.path.join(static_folder, 'uploads', 'system')
        
        print(f"[init_fs] Ensuring directory exists: {system_logo_path}")
        
        if not os.path.exists(system_logo_path):
            os.makedirs(system_logo_path, mode=0o777, exist_ok=True)
            print(f"[init_fs] Created {system_logo_path}")
        else:
            # Explicitly chmod to ensure 777
            try:
                os.chmod(system_logo_path, 0o777)
                print(f"[init_fs] Permissions set to 0o777 for {system_logo_path}")
            except Exception as e:
                print(f"[init_fs] Failed to chmod {system_logo_path}: {e}")
        
        return system_logo_path
    except Exception as e:
        print(f"[init_fs] Error in ensure_system_dirs: {e}")
        return None
