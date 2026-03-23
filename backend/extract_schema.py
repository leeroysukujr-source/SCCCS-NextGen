import sqlite3
import os

def dump_schema(db_path, output_file):
    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found")
        return
    
    conn = sqlite3.connect(db_path)
    with open(output_file, 'w', encoding='utf-8') as f:
        cursor = conn.cursor()
        cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        for name, sql in tables:
            f.write(f"TABLE: {name}\n")
            f.write(f"SQL: {sql}\n")
            f.write("-" * 40 + "\n")
            
            # Relationships are often reflected in foreign keys
            cursor.execute(f"PRAGMA foreign_key_list({name});")
            fks = cursor.fetchall()
            if fks:
                f.write("FOREIGN KEYS:\n")
                for fk in fks:
                    f.write(f"  {fk}\n")
                f.write("-" * 40 + "\n")
            f.write("\n")
    conn.close()

if __name__ == '__main__':
    # We know from earlier that the main DB is in instance/scccs.db
    dump_schema('instance/scccs.db', 'schema_baseline.txt')
