from app import db
from app.models import DirectMessage, ChannelMember, Message
from datetime import datetime


def deliver_missed_messages(socketio, user_id):
    """Emit missed direct and channel messages to the user's personal room.

    This is a best-effort delivery helper called when a socket connects.
    It does NOT mark messages as read — clients should ACK messages
    (see `handle_message_ack`).
    """
    try:
        # Deliver unread direct messages
        dms = DirectMessage.query.filter_by(recipient_id=user_id, is_read=False).order_by(DirectMessage.created_at.asc()).limit(200).all()
        for dm in dms:
            try:
                socketio.emit('direct_message_received', dm.to_dict(), room=f'user_{user_id}')
            except Exception:
                # Don't fail the whole loop on individual emit error
                pass

        # Deliver channel messages since last read for each channel membership
        memberships = ChannelMember.query.filter_by(user_id=user_id).all()
        for mem in memberships:
            try:
                last_read = mem.last_read_at
                query = Message.query.filter_by(channel_id=mem.channel_id)
                if last_read:
                    query = query.filter(Message.created_at > last_read)
                else:
                    # If no last_read_at, only send recent messages (limit)
                    query = query.order_by(Message.created_at.desc()).limit(50)

                msgs = query.order_by(Message.created_at.asc()).all()
                for m in msgs:
                    try:
                        socketio.emit('message_received', m.to_dict(), room=f'user_{user_id}')
                    except Exception:
                        pass
            except Exception:
                # Ignore per-membership failures
                pass
    except Exception:
        # Swallow any unexpected errors in the best-effort helper
        pass


def handle_message_ack(user_id, data):
    """Handle a client acknowledgement for message receipt.

    For direct messages: mark as read.
    For channel messages: update the ChannelMember.last_read_at and increment view_count.
    """
    try:
        message_id = data.get('message_id')
        channel_id = data.get('channel_id')

        if message_id:
            # Try direct message first
            dm = DirectMessage.query.get(message_id)
            if dm and dm.recipient_id == user_id and not dm.is_read:
                dm.is_read = True
                dm.read_at = datetime.utcnow()
                db.session.commit()
                return True

            # Try channel message
            m = Message.query.get(message_id)
            if m and channel_id and m.channel_id == channel_id:
                # Update member's last_read_at
                member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=user_id).first()
                if member:
                    member.last_read_at = datetime.utcnow()
                # Increment message view_count (best-effort)
                try:
                    m.view_count = (m.view_count or 0) + 1
                except Exception:
                    pass
                db.session.commit()
                return True

        # If we didn't match by message id, allow channel-only acks
        if channel_id:
            member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=user_id).first()
            if member:
                member.last_read_at = datetime.utcnow()
                db.session.commit()
                return True

    except Exception:
        try:
            db.session.rollback()
        except Exception:
            pass
    return False
