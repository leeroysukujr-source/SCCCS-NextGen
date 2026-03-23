from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Channel, ChannelMember, User
from app.utils.encryption import generate_key
from app.utils.channel_privacy import can_access_channel
import secrets
import os
import uuid
from werkzeug.utils import secure_filename
import qrcode
import io
import base64
from datetime import datetime, timedelta
from app.models import ChannelInvite
from app.utils.email_utils import send_email
from app.utils.middleware import feature_required

channels_bp = Blueprint('channels', __name__)

@channels_bp.before_request
@feature_required('channels')
def check_channels_enabled():
    pass

@channels_bp.route('', methods=['POST'])
@jwt_required()
def create_channel():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        if not data or not data.get('name'):
            return jsonify({'error': 'Channel name is required'}), 400
        
        # Get current user to check role
        current_user = User.query.get(current_user_id)
        
        # Get feature config for runtime limits
        from app.services.feature_flags import get_feature_config
        feature_config = get_feature_config('channels', current_user.workspace_id)
        
        # Enforce Private Channel restriction
        channel_type = data.get('type', 'private')
        if channel_type == 'private' and not feature_config.get('allow_private_channels', True):
            return jsonify({'error': 'Private channels are disabled by the platform administrator'}), 403
            
        # Enforce max channels per user
        max_allowed = feature_config.get('max_channels_per_user', 10)
        existing_count = Channel.query.filter_by(created_by=current_user_id).count()
        if existing_count >= max_allowed:
            return jsonify({'error': f'You have reached the maximum limit of {max_allowed} channels'}), 403

        # Generate encryption key for the channel
        encryption_key = generate_key()
        
        # Generate unique share code
        share_code = secrets.token_urlsafe(16)
        
        # If admin creates channel, default to public so students/lecturers can access it
        default_type = 'public' if current_user and current_user.role == 'admin' else 'private'
        
        channel = Channel(
            name=data.get('name', '').strip(),
            description=data.get('description', '').strip() if data.get('description') else '',
            type=data.get('type', default_type),  # Public if admin, private otherwise
            course_code=data.get('course_code'),
            workspace_id=current_user.workspace_id,
            created_by=current_user_id,
            is_encrypted=data.get('is_encrypted', True),
            encryption_key=encryption_key.decode('utf-8'),  # Store as string
            share_code=share_code
        )
        
        db.session.add(channel)
        db.session.flush()  # Get channel ID without committing
        
        # Add creator as admin member
        member = ChannelMember(channel_id=channel.id, user_id=current_user_id, role='admin')
        db.session.add(member)
        
        # If admin creates a channel, make it accessible to all users
        # Add all students and lecturers as members (optional - can be done via invite too)
        auto_add_members = data.get('auto_add_members', False)  # Optional flag
        if current_user and current_user.role == 'admin' and auto_add_members:
            # Add all students and lecturers as members
            all_users = User.query.filter(
                User.role.in_(['student', 'teacher'])
            ).all()
            for target_user in all_users:
                if target_user.id != current_user_id:
                    new_member = ChannelMember(
                        channel_id=channel.id,
                        user_id=target_user.id,
                        role='member'
                    )
                    db.session.add(new_member)
        
        # Add additional members if provided
        member_ids = data.get('member_ids', [])
        if member_ids and isinstance(member_ids, list):
            for member_id in member_ids:
                # Skip if trying to add creator as member (already added as admin)
                if member_id != current_user_id:
                    # Check if user exists
                    user = User.query.get(member_id)
                    if user:
                        # Check if already a member (shouldn't happen, but just in case)
                        existing_member = ChannelMember.query.filter_by(
                            channel_id=channel.id,
                            user_id=member_id
                        ).first()
                        if not existing_member:
                            new_member = ChannelMember(
                                channel_id=channel.id,
                                user_id=member_id,
                                role='member'
                            )
                            db.session.add(new_member)
        
        db.session.commit()
        
        # Return channel with encryption key (only for creator)
        channel_dict = channel.to_dict()
        channel_dict['encryption_key'] = encryption_key.decode('utf-8')  # Send key to creator
        
        return jsonify(channel_dict), 201
    
    except Exception as e:
        db.session.rollback()
        print(f"Error creating channel: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to create channel: {str(e)}'}), 500

@channels_bp.route('', methods=['GET'])
@jwt_required()
def get_channels():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Admin can see ALL channels (list view only - cannot access messages)
    if user.role == 'admin':
        all_channels = Channel.query.order_by(Channel.created_at.desc()).all()
        # Return channel list with creator info, but without encryption keys
        channels_list = []
        for channel in all_channels:
            channel_dict = channel.to_dict()
            # Remove encryption key from admin view
            if 'encryption_key' in channel_dict:
                del channel_dict['encryption_key']
            channels_list.append(channel_dict)
        return jsonify(channels_list), 200
    
    # Regular users: Get channels where user is a member
    member_channels = db.session.query(Channel).join(ChannelMember).filter(
        ChannelMember.user_id == current_user_id
    ).all()
    
    return jsonify([channel.to_dict() for channel in member_channels]), 200

@channels_bp.route('/<int:channel_id>', methods=['GET'])
@jwt_required()
def get_channel(channel_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    channel = Channel.query.get(channel_id)
    
    if not channel:
        return jsonify({'error': 'Channel not found'}), 404
    
    # Admins can access all channels fully (full system management)
    if user and user.role == 'admin':
        channel_dict = channel.to_dict()
        # Admins can see everything including encryption keys for full access
        return jsonify(channel_dict), 200
    
    # Check privacy - regular users can only access channels they are members of
    if not can_access_channel(current_user_id, channel_id):
        return jsonify({'error': 'Access denied. You do not have permission to access this channel.'}), 403
    
    channel_dict = channel.to_dict()
    
    # Only return encryption key to creator
    if channel.created_by == current_user_id and channel.encryption_key:
        channel_dict['encryption_key'] = channel.encryption_key
    
    return jsonify(channel_dict), 200

@channels_bp.route('/<int:channel_id>/join', methods=['POST'])
@jwt_required()
def join_channel(channel_id):
    current_user_id = get_jwt_identity()
    channel = Channel.query.get(channel_id)
    
    if not channel:
        return jsonify({'error': 'Channel not found'}), 404
    
    if channel.type == 'private':
        return jsonify({'error': 'Cannot join private channel'}), 403
        
    # If course, must be published (unless creator/admin)
    if channel.type == 'course' and channel.status != 'published':
        user = User.query.get(current_user_id)
        is_creator = channel.created_by == current_user_id
        is_admin = user and user.role == 'admin'
        if not is_creator and not is_admin:
             return jsonify({'error': 'Course is not published yet'}), 403
    
    # Check if already a member
    existing = ChannelMember.query.filter_by(channel_id=channel_id, user_id=current_user_id).first()
    if existing:
        return jsonify(channel.to_dict()), 200
    
    # Add member
    member = ChannelMember(channel_id=channel_id, user_id=current_user_id, role='member')
    db.session.add(member)
    db.session.commit()
    
    return jsonify(channel.to_dict()), 200
    


@channels_bp.route('/<int:channel_id>/invites', methods=['POST'])
@jwt_required()
def create_invite(channel_id):
    """Create an expiring, optionally email-targeted invite for a channel."""
    current_user_id = get_jwt_identity()
    channel = Channel.query.get(channel_id)
    if not channel:
        return jsonify({'error': 'Channel not found'}), 404

    # Check admin rights
    member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=current_user_id).first()
    is_admin = (member and member.role in ['admin', 'co-admin']) or (channel.created_by == current_user_id) or (User.query.get(current_user_id) and User.query.get(current_user_id).role == 'admin')
    if not is_admin:
        return jsonify({'error': 'Only channel admins can create invites'}), 403

    data = request.get_json() or {}
    # expires_in_days or expires_at ISO
    expires_in_days = data.get('expires_in_days')
    expires_at = None
    if data.get('expires_at'):
        try:
            expires_at = datetime.fromisoformat(data.get('expires_at'))
        except Exception:
            expires_at = None
    elif expires_in_days:
        try:
            expires_at = datetime.utcnow() + timedelta(days=int(expires_in_days))
        except Exception:
            expires_at = None

    max_uses = data.get('max_uses')
    email = data.get('email')

    token = secrets.token_urlsafe(24)
    invite = ChannelInvite(
        channel_id=channel_id,
        token=token,
        created_by=current_user_id,
        email=email,
        max_uses=int(max_uses) if max_uses else None,
        expires_at=expires_at
    )
    db.session.add(invite)
    db.session.commit()

    # Audit: invite created
    try:
        from app.models import InviteAudit
        audit = InviteAudit(invite_id=invite.id, channel_id=channel_id, action='created', actor_id=current_user_id, ip_address=request.remote_addr)
        db.session.add(audit)
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Optionally send email
    if email:
        join_url = f"{request.host_url}join-invite/{token}"
        subject = f"You're invited to join channel: {channel.name}"
        html_body = f"<p>You've been invited to join the channel <strong>{channel.name}</strong>.</p><p>Click to join: <a href=\"{join_url}\">{join_url}</a></p>"
        send_email(email, subject, html_body=html_body)

    return jsonify(invite.to_dict()), 201


@channels_bp.route('/<int:channel_id>/invites', methods=['GET'])
@jwt_required()
def list_invites(channel_id):
    current_user_id = get_jwt_identity()
    channel = Channel.query.get(channel_id)
    if not channel:
        return jsonify({'error': 'Channel not found'}), 404

    # Admin check
    member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=current_user_id).first()
    if not (member and member.role in ['admin', 'co-admin']) and channel.created_by != current_user_id and not (User.query.get(current_user_id) and User.query.get(current_user_id).role == 'admin'):
        return jsonify({'error': 'Only channel admins can list invites'}), 403

    invites = ChannelInvite.query.filter_by(channel_id=channel_id).order_by(ChannelInvite.created_at.desc()).all()
    return jsonify([inv.to_dict() for inv in invites]), 200


@channels_bp.route('/<int:channel_id>/invites/<token>', methods=['DELETE'])
@jwt_required()
def revoke_invite(channel_id, token):
    current_user_id = get_jwt_identity()
    channel = Channel.query.get(channel_id)
    if not channel:
        return jsonify({'error': 'Channel not found'}), 404

    # Admin check
    member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=current_user_id).first()
    if not (member and member.role in ['admin', 'co-admin']) and channel.created_by != current_user_id and not (User.query.get(current_user_id) and User.query.get(current_user_id).role == 'admin'):
        return jsonify({'error': 'Only channel admins can revoke invites'}), 403

    invite = ChannelInvite.query.filter_by(channel_id=channel_id, token=token).first()
    if not invite:
        return jsonify({'error': 'Invite not found'}), 404

    invite.revoked = True
    db.session.commit()
    # Audit: invite revoked
    try:
        from app.models import InviteAudit
        audit = InviteAudit(invite_id=invite.id, channel_id=channel_id, action='revoked', actor_id=current_user_id, ip_address=request.remote_addr)
        db.session.add(audit)
        db.session.commit()
    except Exception:
        db.session.rollback()

    return jsonify({'message': 'Invite revoked'}), 200


@channels_bp.route('/join-invite/<token>', methods=['POST'])
@jwt_required()
def join_via_invite(token):
    current_user_id = get_jwt_identity()
    invite = ChannelInvite.query.filter_by(token=token).first()
    if not invite:
        return jsonify({'error': 'Invalid invite token'}), 404

    if not invite.is_valid():
        return jsonify({'error': 'Invite is expired, revoked, or used up'}), 403

    # If invite is email-targeted, require matching email
    if invite.email:
        user = User.query.get(current_user_id)
        if not user or (user.email.lower() != invite.email.lower()):
            return jsonify({'error': 'This invite is restricted to a specific email address'}), 403

    # Add member if not already
    existing = ChannelMember.query.filter_by(channel_id=invite.channel_id, user_id=current_user_id).first()
    if not existing:
        new_member = ChannelMember(channel_id=invite.channel_id, user_id=current_user_id, role='member')
        db.session.add(new_member)

    # Update invite usage
    invite.uses = (invite.uses or 0) + 1
    db.session.commit()

    # Audit: invite used
    try:
        from app.models import InviteAudit
        audit = InviteAudit(invite_id=invite.id, channel_id=invite.channel_id, action='used', actor_id=current_user_id, target_user_id=current_user_id, ip_address=request.remote_addr)
        db.session.add(audit)
        db.session.commit()
    except Exception:
        db.session.rollback()

    channel = Channel.query.get(invite.channel_id)
    return jsonify(channel.to_dict()), 200
    # Add as regular member (not admin unless designated by creator)
    member = ChannelMember(channel_id=channel_id, user_id=current_user_id, role='member')
    db.session.add(member)
    db.session.commit()
    
    return jsonify(channel.to_dict()), 200

@channels_bp.route('/<int:channel_id>/leave', methods=['POST'])
@jwt_required()
def leave_channel(channel_id):
    current_user_id = get_jwt_identity()
    
    member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=current_user_id).first()
    
    if not member:
        return jsonify({'error': 'Not a member'}), 404
    
    db.session.delete(member)
    db.session.commit()
    
    return jsonify({'message': 'Left channel successfully'}), 200

@channels_bp.route('/<int:channel_id>/members', methods=['GET'])
@jwt_required()
def get_channel_members(channel_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    channel = Channel.query.get(channel_id)
    if not channel:
        return jsonify({'error': 'Channel not found'}), 404
    
    # Admins can access all channels' members, regular users need membership
    if not user or user.role != 'admin':
        if not can_access_channel(current_user_id, channel_id):
            return jsonify({'error': 'Access denied. You do not have permission to access this channel.'}), 403
    
    members = ChannelMember.query.filter_by(channel_id=channel_id).all()
    members_list = []
    for m in members:
        user = User.query.get(m.user_id)
        if user:
            member_dict = user.to_dict()
            member_dict['member_role'] = m.role  # Add member role to user dict
            member_dict['joined_at'] = m.joined_at.isoformat() if m.joined_at else None
            members_list.append(member_dict)
    
    return jsonify(members_list), 200

@channels_bp.route('/<int:channel_id>', methods=['PUT'])
@jwt_required()
def update_channel(channel_id):
    """Update channel settings - Only creator or admin can update"""
    current_user_id = get_jwt_identity()
    channel = Channel.query.get(channel_id)
    
    if not channel:
        return jsonify({'error': 'Channel not found'}), 404
    
    # Check permissions - only creator or channel admin can update
    is_creator = channel.created_by == current_user_id
    member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=current_user_id).first()
    is_admin = member and member.role in ['admin', 'co-admin']
    
    if not is_creator and not is_admin:
        return jsonify({'error': 'Only channel creator or admins can update channel settings'}), 403
    
    data = request.get_json()
    
    # Update allowed fields
    if 'name' in data:
        channel.name = data['name'].strip()
    if 'description' in data:
        channel.description = data.get('description', '').strip()
    
    from datetime import datetime
    channel.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(channel.to_dict()), 200

@channels_bp.route('/<int:channel_id>', methods=['DELETE'])
@jwt_required()
def delete_channel(channel_id):
    """Delete a channel - Creator or system admin can delete"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    channel = Channel.query.get(channel_id)
    
    if not channel:
        return jsonify({'error': 'Channel not found'}), 404
    
    # Admin can delete any channel, creator can delete their own channel
    is_admin = user and user.role == 'admin'
    is_creator = channel.created_by == current_user_id
    
    if not is_admin and not is_creator:
        return jsonify({'error': 'Only the channel creator or system admin can delete this channel'}), 403
    
    # Delete all members and messages first (cascade should handle this, but explicit is safer)
    ChannelMember.query.filter_by(channel_id=channel_id).delete()
    from app.models import Message, Assignment
    Message.query.filter_by(channel_id=channel_id).delete()
    
    # Unlink assignments so they are not deleted but removed from the course view
    Assignment.query.filter_by(channel_id=channel_id).update({'channel_id': None})
    
    db.session.delete(channel)
    db.session.commit()
    
    return jsonify({'message': 'Channel deleted successfully'}), 200

@channels_bp.route('/<int:channel_id>/share-link', methods=['GET'])
@jwt_required()
def get_share_link(channel_id):
    """Generate or get share link for channel - Only admins"""
    current_user_id = get_jwt_identity()
    channel = Channel.query.get(channel_id)
    
    if not channel:
        return jsonify({'error': 'Channel not found'}), 404
    
    # Check if user is admin
    is_creator = channel.created_by == current_user_id
    member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=current_user_id).first()
    is_admin = member and member.role in ['admin', 'co-admin']
    
    if not is_creator and not is_admin:
        return jsonify({'error': 'Only channel admins can generate share links'}), 403
    
    # Generate share code if doesn't exist
    if not channel.share_code:
        channel.share_code = secrets.token_urlsafe(16)
        db.session.commit()
    
    # Handle regen param to explicitly create a new share code (revokes old)
    regen = request.args.get('regen', '0')
    if regen and regen.lower() in ['1', 'true', 'yes']:
        try:
            channel.share_code = secrets.token_urlsafe(16)
            db.session.commit()
            # Audit: share link regenerated (treated as invite regen)
            try:
                from app.models import InviteAudit
                audit = InviteAudit(channel_id=channel.id, action='regenerated', actor_id=current_user_id if 'current_user_id' in locals() else None, ip_address=request.remote_addr)
                db.session.add(audit)
                db.session.commit()
            except Exception:
                db.session.rollback()
        except Exception:
            db.session.rollback()

    # Generate share link
    share_link = f"{request.host_url}join/{channel.share_code}"

    # If qr param requested, generate QR code as base64 PNG
    qr = request.args.get('qr', '0')
    qr_image_b64 = None
    if qr and qr.lower() in ['1', 'true', 'yes']:
        try:
            qr_obj = qrcode.QRCode(box_size=6, border=2)
            qr_obj.add_data(share_link)
            qr_obj.make(fit=True)
            img = qr_obj.make_image(fill_color="black", back_color="white")
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            buf.seek(0)
            qr_image_b64 = base64.b64encode(buf.read()).decode('ascii')
        except Exception:
            qr_image_b64 = None

    return jsonify({
        'share_code': channel.share_code,
        'share_link': share_link,
        'qr_image_base64': qr_image_b64
    }), 200

@channels_bp.route('/<int:channel_id>/avatar', methods=['POST'])
@jwt_required()
def upload_channel_avatar(channel_id):
    """Upload channel avatar - Only admins"""
    current_user_id = get_jwt_identity()
    channel = Channel.query.get(channel_id)
    
    if not channel:
        return jsonify({'error': 'Channel not found'}), 404
    
    # Check if user is admin
    is_creator = channel.created_by == current_user_id
    member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=current_user_id).first()
    is_admin = member and member.role in ['admin', 'co-admin']
    
    if not is_creator and not is_admin:
        return jsonify({'error': 'Only channel admins can upload avatars'}), 403
    
    if 'avatar' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['avatar']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Validate file type
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    if '.' not in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
        return jsonify({'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WEBP'}), 400
    
    # Save file
    filename = secure_filename(f"{channel_id}_{uuid.uuid4().hex}.{file.filename.rsplit('.', 1)[1].lower()}")
    upload_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads', 'avatars')
    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, filename)
    file.save(file_path)
    
    # Update channel avatar URL
    channel.avatar_url = f"/uploads/avatars/{filename}"
    db.session.commit()
    
    return jsonify({
        'avatar_url': channel.avatar_url,
        'message': 'Avatar uploaded successfully'
    }), 200

@channels_bp.route('/join/<share_code>', methods=['POST'])
@jwt_required()
def join_via_share_code(share_code):
    """Join channel using share code"""
    current_user_id = get_jwt_identity()
    
    channel = Channel.query.filter_by(share_code=share_code).first()
    if not channel:
        return jsonify({'error': 'Invalid share code'}), 404
    
    # Check if already a member
    existing = ChannelMember.query.filter_by(channel_id=channel.id, user_id=current_user_id).first()
    if existing:
        return jsonify(channel.to_dict()), 200
    
    # Add as member
    member = ChannelMember(channel_id=channel.id, user_id=current_user_id, role='member')
    db.session.add(member)
    db.session.commit()
    
    return jsonify(channel.to_dict()), 200


@channels_bp.route('/<int:channel_id>/members/add', methods=['POST'])
@jwt_required()
def add_channel_member(channel_id):
    """Add a user to the channel by admin (by user_id or email)."""
    current_user_id = get_jwt_identity()
    channel = Channel.query.get(channel_id)
    if not channel:
        return jsonify({'error': 'Channel not found'}), 404

    # Check if current user is channel admin or creator
    member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=current_user_id).first()
    is_admin = (member and member.role in ['admin', 'co-admin']) or (channel.created_by == current_user_id) or (User.query.get(current_user_id) and User.query.get(current_user_id).role == 'admin')
    if not is_admin:
        return jsonify({'error': 'Only channel admins can add members'}), 403

    data = request.get_json() or {}
    user_id = data.get('user_id')
    email = data.get('email')

    target_user = None
    if user_id:
        target_user = User.query.get(user_id)
    elif email:
        target_user = User.query.filter_by(email=email).first()
    else:
        return jsonify({'error': 'Provide user_id or email'}), 400

    if not target_user:
        return jsonify({'error': 'User not found'}), 404

    # Check if already a member
    existing = ChannelMember.query.filter_by(channel_id=channel_id, user_id=target_user.id).first()
    if existing:
        return jsonify({'message': 'User already a member', 'member': {'user_id': target_user.id, 'role': existing.role}}), 200

    # Allow admin to optionally set the initial role when adding a member
    role = data.get('role', 'member')
    if role not in ['admin', 'co-admin', 'member']:
        role = 'member'

    new_member = ChannelMember(channel_id=channel_id, user_id=target_user.id, role=role)
    db.session.add(new_member)
    db.session.commit()

    return jsonify({'message': 'Member added successfully', 'member': {'user_id': target_user.id, 'role': 'member'}}), 201


@channels_bp.route('/<int:channel_id>/members/<int:user_id>/role', methods=['PUT'])
@jwt_required()
def update_member_role(channel_id, user_id):
    """Update member role - Only channel admin/co-admin can do this"""
    current_user_id = get_jwt_identity()
    channel = Channel.query.get(channel_id)
    
    if not channel:
        return jsonify({'error': 'Channel not found'}), 404
    
    # Check if current user is channel admin or co-admin
    current_member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=current_user_id).first()
    if not current_member or current_member.role not in ['admin', 'co-admin']:
        # Creator is always admin, check that too
        if channel.created_by != current_user_id:
            return jsonify({'error': 'Only channel admins can update member roles'}), 403
    
    # Check if target user is a member
    target_member = ChannelMember.query.filter_by(channel_id=channel_id, user_id=user_id).first()
    if not target_member:
        return jsonify({'error': 'User is not a member of this channel'}), 404
    
    # Cannot change creator's role
    if channel.created_by == user_id:
        return jsonify({'error': 'Cannot change the creator\'s role'}), 400
    
    data = request.get_json()
    new_role = data.get('role', 'member')
    
    if new_role not in ['admin', 'co-admin', 'member']:
        return jsonify({'error': 'Invalid role. Must be admin, co-admin, or member'}), 400
    
    target_member.role = new_role
    db.session.commit()
    
    return jsonify({'message': 'Member role updated successfully', 'member': target_member.to_dict()}), 200


@channels_bp.route('/<int:channel_id>/publish', methods=['PUT'])
@jwt_required()
def publish_channel(channel_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    channel = Channel.query.get(channel_id)
    if not channel: return jsonify({'error': 'Not found'}), 404
    
    # Admin or creator
    is_admin = user and user.role == 'admin'
    if not is_admin and channel.created_by != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    channel.status = 'published'
    db.session.commit()
    return jsonify(channel.to_dict()), 200

@channels_bp.route('/available', methods=['GET'])
@jwt_required()
def get_available_courses():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Courses: type='course', status='published', workspace_id=user.workspace_id
    query = Channel.query.filter_by(
        type='course', 
        status='published', 
        workspace_id=user.workspace_id
    )
    
    courses = query.order_by(Channel.created_at.desc()).all()
    
    # Attach is_member
    member_channel_ids = [m.channel_id for m in ChannelMember.query.filter_by(user_id=current_user_id).all()]
    results = []
    for c in courses:
        d = c.to_dict()
        d['is_member'] = c.id in member_channel_ids
        results.append(d)
        
    return jsonify(results), 200

