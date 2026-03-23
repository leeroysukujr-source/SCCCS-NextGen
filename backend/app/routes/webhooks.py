"""
Webhook Management Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User
from app.models.integrations import Webhook, WebhookDelivery, APIToken
from app.utils.webhooks import trigger_webhook
from app.utils.audit import log_audit_event
from datetime import datetime
import json

webhooks_bp = Blueprint('webhooks', __name__)

@webhooks_bp.route('', methods=['GET'])
@jwt_required()
def get_webhooks():
    """Get user's webhooks"""
    current_user_id = get_jwt_identity()
    
    webhooks = Webhook.query.filter_by(user_id=current_user_id).all()
    
    return jsonify([w.to_dict() for w in webhooks]), 200

@webhooks_bp.route('', methods=['POST'])
@jwt_required()
def create_webhook():
    """Create a new webhook"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    name = data.get('name')
    url = data.get('url')
    events = data.get('events', [])
    
    if not name or not url:
        return jsonify({'error': 'Name and URL are required'}), 400
    
    webhook = Webhook(
        user_id=current_user_id,
        name=name,
        url=url,
        secret=Webhook.generate_secret(),
        events=json.dumps(events),
        is_active=True
    )
    
    db.session.add(webhook)
    db.session.commit()
    
    log_audit_event(current_user_id, 'webhook_created', 'webhook', webhook.id)
    
    return jsonify(webhook.to_dict()), 201

@webhooks_bp.route('/<int:webhook_id>', methods=['PUT'])
@jwt_required()
def update_webhook(webhook_id):
    """Update a webhook"""
    current_user_id = get_jwt_identity()
    webhook = Webhook.query.get(webhook_id)
    
    if not webhook or webhook.user_id != current_user_id:
        return jsonify({'error': 'Webhook not found'}), 404
    
    data = request.get_json()
    
    if 'name' in data:
        webhook.name = data['name']
    if 'url' in data:
        webhook.url = data['url']
    if 'events' in data:
        webhook.events = json.dumps(data['events'])
    if 'is_active' in data:
        webhook.is_active = data['is_active']
    
    db.session.commit()
    
    log_audit_event(current_user_id, 'webhook_updated', 'webhook', webhook_id)
    
    return jsonify(webhook.to_dict()), 200

@webhooks_bp.route('/<int:webhook_id>', methods=['DELETE'])
@jwt_required()
def delete_webhook(webhook_id):
    """Delete a webhook"""
    current_user_id = get_jwt_identity()
    webhook = Webhook.query.get(webhook_id)
    
    if not webhook or webhook.user_id != current_user_id:
        return jsonify({'error': 'Webhook not found'}), 404
    
    db.session.delete(webhook)
    db.session.commit()
    
    log_audit_event(current_user_id, 'webhook_deleted', 'webhook', webhook_id)
    
    return jsonify({'message': 'Webhook deleted'}), 200

@webhooks_bp.route('/<int:webhook_id>/deliveries', methods=['GET'])
@jwt_required()
def get_webhook_deliveries(webhook_id):
    """Get webhook delivery history"""
    current_user_id = get_jwt_identity()
    webhook = Webhook.query.get(webhook_id)
    
    if not webhook or webhook.user_id != current_user_id:
        return jsonify({'error': 'Webhook not found'}), 404
    
    limit = request.args.get('limit', 50, type=int)
    deliveries = WebhookDelivery.query.filter_by(webhook_id=webhook_id).order_by(
        WebhookDelivery.created_at.desc()
    ).limit(limit).all()
    
    return jsonify([d.to_dict() for d in deliveries]), 200

@webhooks_bp.route('/<int:webhook_id>/test', methods=['POST'])
@jwt_required()
def test_webhook(webhook_id):
    """Test a webhook"""
    current_user_id = get_jwt_identity()
    webhook = Webhook.query.get(webhook_id)
    
    if not webhook or webhook.user_id != current_user_id:
        return jsonify({'error': 'Webhook not found'}), 404
    
    test_payload = {
        'event': 'webhook.test',
        'timestamp': datetime.utcnow().isoformat(),
        'data': {'message': 'This is a test webhook'}
    }
    
    delivery = trigger_webhook(webhook_id, 'webhook.test', test_payload)
    
    if delivery:
        return jsonify(delivery.to_dict()), 200
    else:
        return jsonify({'error': 'Failed to trigger webhook'}), 500

