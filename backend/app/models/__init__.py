"""
Models package - Re-exports all models from app.models.py and submodules

This module bridges app/models.py (file) and app/models/ (directory) by re-exporting
all model classes from models.py so that "from app.models import User" works correctly.
"""

# Import all main models from models.py using importlib
# We need to load models.py from the parent directory
import importlib.util
from pathlib import Path

# Path to the models.py file in parent directory
_models_py_file = Path(__file__).parent.parent / 'models.py'

if _models_py_file.exists():
    # Load models.py as a separate module
    spec = importlib.util.spec_from_file_location("_app_models_module", _models_py_file)
    if spec and spec.loader:
        _models_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(_models_module)
        
        # Add attributes to this package's namespace
        for name, obj in vars(_models_module).items():
            if not name.startswith('_'):
                globals()[name] = obj

# Import new Study Room Document models
from .document import Document, DocumentVersion
from .security import AuditLog
from .academic import Submission
from .whiteboard import Whiteboard
from .system_settings import SystemSetting

# Import chat feature models from submodule
from app.models.chat_features import (
    MessageReaction,
    MessageReadReceipt,
    PinnedMessage,
    MessageForward,
    MessageEditHistory,
    ChannelPoll,
    PollVote,
    ChannelTopic,
    ScheduledMessage,
    ScheduledMessage,
    ChannelMute
)

from app.models.reporting import ReportRequest, ReportSubmission
from app.models.collaboration import Presence

# Create __all__ list with all exported models
__all__ = [
    name for name in globals().keys()
    if not name.startswith('_') 
    and isinstance(globals().get(name), type)
    and hasattr(globals().get(name), '__tablename__')
]
