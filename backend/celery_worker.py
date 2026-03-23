import os
from celery import Celery
from app import create_app
from config import Config

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
