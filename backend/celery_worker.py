import os
from celery import Celery
from app import create_app, db
from config import Config
from datetime import datetime

def make_celery(app):
    celery = Celery(
        app.import_name,
        backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
        broker=os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    )
    celery.conf.update(app.config)

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery

flask_app = create_app(Config)
celery = make_celery(flask_app)

# ==============================================================================
# AI Pipeline Asynchronous Tasks (Celery Workers)
# ==============================================================================
@celery.task(name="app.tasks.ai.process_whisper")
def process_whisper(audio_file_path):
    """
    Background worker for Whisper ASR pipeline.
    To be triggered during remote execution.
    """
    print(f"[Celery] Processing audio with Whisper pipeline: {audio_file_path}")
    # Integration point for Whisper local inference or API
    return {"status": "success", "transcription": "Pending Pipeline Initialization"}

@celery.task(name="app.tasks.ai.process_bart")
def process_bart(text_payload):
    """
    Background worker for BART-CNN summarization pipeline.
    """
    print(f"[Celery] Summarizing text with BART-CNN: {text_payload[:50]}...")
    # Integration point for HuggingFace Transformers logic
    return {"status": "success", "summary": "Pending Pipeline Initialization"}

@celery.task(name="app.tasks.cleanup.ephemeral_rooms")
def cleanup_ephemeral_rooms():
    """
    Periodic task to delete expired ephemeral rooms and their associated data.
    Scheduled to run every hour.
    """
    from app.models import Room
    now = datetime.utcnow()
    expired_rooms = Room.query.filter(
        Room.is_ephemeral == True,
        Room.expires_at <= now
    ).all()
    
    count = 0
    for room in expired_rooms:
        # Cascade delete will handle participants and other related entities
        db.session.delete(room)
        count += 1
    
    db.session.commit()
    return {"status": "success", "deleted_count": count}

# Configure Celery Beat for periodic tasks
celery.conf.beat_schedule = {
    'cleanup-ephemeral-rooms-every-hour': {
        'task': 'app.tasks.cleanup.ephemeral_rooms',
        'schedule': 3600.0, # 1 hour
    },
}
