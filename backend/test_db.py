from app import create_app, db
from sqlalchemy import text
import traceback

app = create_app()

def test_db():
    print("Testing Database Connection...")
    with app.app_context():
        try:
            # Test 1: Basic connection
            db.session.execute(text('SELECT 1'))
            print("Database Connection: SUCCESS")
            
            # Test 2: Check Workspace table
            from app.models import Workspace
            ws_count = Workspace.query.count()
            print(f"Workspace Count: {ws_count}")
            
            # Test 3: Check User table
            from app.models import User
            user_count = User.query.count()
            print(f"User Count: {user_count}")
            
        except Exception as e:
            print("Database Connection: FAILED")
            print(f"Error Type: {type(e).__name__}")
            print(f"Error Message: {str(e)}")
            # traceback.print_exc()

if __name__ == "__main__":
    test_db()
