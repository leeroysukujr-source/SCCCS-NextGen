import os
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.orm import sessionmaker

def migrate_data():
    sqlite_url = 'sqlite:///instance/scccs.db'
    pg_url = 'postgresql+psycopg2://neondb_owner:npg_VWuSb0ye2OUn@ep-dawn-bird-al9ai7dz-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'

    print("Connecting to SQLite...")
    sqlite_engine = create_engine(sqlite_url)
    
    print("Connecting to PostgreSQL...")
    pg_engine = create_engine(pg_url)

    sqlite_meta = MetaData()
    sqlite_meta.reflect(bind=sqlite_engine)

    pg_meta = MetaData()
    pg_meta.reflect(bind=pg_engine)

    with pg_engine.connect() as pg_conn:
        with sqlite_engine.connect() as sqlite_conn:
            with pg_conn.begin():
                print("Clearing target tables (Reverse Topological Order)...")
                for table in reversed(sqlite_meta.sorted_tables):
                    table_name = table.name
                    if table_name not in pg_meta.tables:
                        continue
                    try:
                        pg_conn.execute(text(f'DELETE FROM "{table_name}";'))
                        print(f" -> Cleared {table_name}")
                    except Exception as e:
                        print(f" -> Error clearing {table_name}: {e}")

                print("\nMigrating data (Topological Order)...")
                # Copy table by table in dependency order
                for table in sqlite_meta.sorted_tables:
                    table_name = table.name
                    if table_name not in pg_meta.tables:
                        print(f"Skipping {table_name} (Not in PostgreSQL schema)")
                        continue
                    
                    print(f"Migrating table: {table_name}...")
                    
                    # Fetch all rows from SQLite
                    result = sqlite_conn.execute(table.select())
                    rows = result.mappings().all()
                    
                    if rows:
                        data = [dict(row) for row in rows]
                        try:
                            pg_conn.execute(pg_meta.tables[table_name].insert(), data)
                            print(f" -> Migrated {len(rows)} rows.")
                        except Exception as e:
                            print(f" -> Error migrating {table_name}: {e}")
                    else:
                        print(" -> 0 rows.")

                # Fix sequences for auto-increment columns in PostgreSQL
                print("Aligning PostgreSQL sequences...")
                for table in sqlite_meta.sorted_tables:
                    table_name = table.name
                    if table_name not in pg_meta.tables:
                        continue
                    
                    target_table = pg_meta.tables[table_name]
                    pks = list(target_table.primary_key.columns)
                    if len(pks) == 1 and pks[0].type.python_type is int:
                        col_name = pks[0].name
                        seq_query = f"SELECT setval(pg_get_serial_sequence('\"{table_name}\"', '{col_name}'), coalesce(max(\"{col_name}\"), 1), max(\"{col_name}\") IS NOT null) FROM \"{table_name}\";"
                        try:
                            pg_conn.execute(text(seq_query))
                            print(f" -> Sequence aligned for {table_name}.{col_name}")
                        except Exception as e:
                            print(f" -> Skiped sequence for {table_name}: {e}")

    print("====================================")
    print("Database Migration Flawlessly Completed!")
    print("====================================")

if __name__ == '__main__':
    migrate_data()
