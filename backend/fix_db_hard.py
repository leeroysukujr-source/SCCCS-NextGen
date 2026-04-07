import sqlalchemy
from app import create_app, db

app = create_app()

SQL = """
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    category VARCHAR(50) DEFAULT 'general',
    value_type VARCHAR(20) DEFAULT 'string',
    description VARCHAR(255),
    is_public BOOLEAN DEFAULT FALSE,
    admin_only BOOLEAN DEFAULT TRUE,
    is_overridable BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
"""

with app.app_context():
    print("Creating table system_settings...")
    try:
        db.session.execute(sqlalchemy.text(SQL))
        db.session.commit()
        print("Success.")
    except Exception as e:
        print("Failed:", dict(e.orig.__dict__) if hasattr(e, 'orig') else e)
        db.session.rollback()
