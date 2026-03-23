import sqlite3
import os

def check_db(db_name):
    print(f"Checking {db_name}...")
    if not os.path.exists(db_name):
        print(f"File {db_name} does not exist.")
        return
    
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Tables: {[t[0] for t in tables]}")
    
    if ('users',) in tables or 'users' in [t[0] for t in tables]:
        cursor.execute("SELECT id, username, role FROM users;")
        users = cursor.fetchall()
        print(f"Users ({len(users)}):")
        for u in users:
            print(f"  ID: {u[0]}, Username: {u[1]}, Role: {u[2]}")
    conn.close()

if __name__ == '__main__':
    check_db('instance/scccs.db')
    print("-" * 20)
    check_db('scccs.db')
    print("-" * 20)
    check_db('app.db')
