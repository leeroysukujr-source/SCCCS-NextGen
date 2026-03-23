import threading
import time
from datetime import datetime
from app import db, socketio
from app.models.chat_features import ScheduledMessage
from app.models import Message, User, Channel
from app.models import File
import json
import traceback
from datetime import timedelta


POLL_INTERVAL_SECONDS = 15


def _process_due_messages(app):
    """Background loop that checks for due scheduled messages and sends them."""
    with app.app_context():
        while True:
            try:
                now = datetime.utcnow()
                # Find scheduled messages that are due
                due = ScheduledMessage.query.filter(
                    ScheduledMessage.status == 'scheduled',
                    ScheduledMessage.scheduled_for <= now
                ).all()

                for sched in due:
                    try:
                        # Mark as sending to avoid races in multi-threaded contexts
                        sched.status = 'sending'
                        db.session.add(sched)
                        db.session.commit()

                        # Create actual Message row
                        message = Message(
                            channel_id=sched.channel_id,
                            author_id=sched.author_id,
                            content=sched.content,
                            message_type=sched.message_type,
                        )
                        db.session.add(message)
                        db.session.flush()

                        # Attach any scheduled files
                        if sched.file_ids:
                            try:
                                file_ids = json.loads(sched.file_ids)
                                for fid in file_ids:
                                    fobj = File.query.get(fid)
                                    if fobj:
                                        fobj.message_id = message.id
                                        db.session.add(fobj)
                            except Exception:
                                # ignore malformed file list
                                pass

                        # Commit message and file attachments
                        db.session.commit()

                        # Emit via Socket.IO
                        try:
                            message_dict = message.to_dict()
                            socketio.emit('message_received', message_dict, room=f'channel_{message.channel_id}')
                        except Exception:
                            # Non-fatal: continue
                            pass

                        # Update scheduled message
                        sched.sent_at = datetime.utcnow()
                        sched.status = 'sent'
                        db.session.add(sched)
                        db.session.commit()
                    except Exception:
                        # In case of failure processing a scheduled message, implement retry/backoff
                        try:
                            tb = traceback.format_exc()
                            sched.attempts = (sched.attempts or 0) + 1
                            sched.last_error = tb
                            MAX_ATTEMPTS = 3
                            if sched.attempts >= MAX_ATTEMPTS:
                                sched.status = 'failed'
                            else:
                                # Reschedule for later with backoff
                                delay = (sched.retry_interval_seconds or 300) * sched.attempts
                                sched.scheduled_for = datetime.utcnow() + timedelta(seconds=delay)
                                sched.status = 'scheduled'
                            db.session.add(sched)
                            db.session.commit()
                        except Exception:
                            db.session.rollback()
                # Sleep until next poll
            except Exception:
                # Top-level loop safety: don't crash the thread
                try:
                    db.session.rollback()
                except Exception:
                    pass

            time.sleep(POLL_INTERVAL_SECONDS)


def start_scheduler(app):
    """Start the scheduler background thread. Safe to call multiple times; only one thread will be created per process.

    Call this after the Flask app and extensions (db, socketio) are initialized.
    """
    thread_name = 'scheduled-message-worker'
    # Don't start multiple threads if already running
    for t in threading.enumerate():
        if t.name == thread_name:
            return

    t = threading.Thread(target=_process_due_messages, args=(app,), name=thread_name, daemon=True)
    t.start()
