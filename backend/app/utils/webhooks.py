"""
Webhook Utilities for Event-Driven Integrations
"""
import requests
import hmac
import hashlib
import json
from datetime import datetime
from app import db
from app.models.integrations import Webhook, WebhookDelivery
from app import socketio

def trigger_webhook(webhook_id, event_type, payload):
    """Trigger a webhook delivery"""
    webhook = Webhook.query.get(webhook_id)
    if not webhook or not webhook.is_active:
        return None
    
    # Create delivery record
    delivery = WebhookDelivery(
        webhook_id=webhook_id,
        event_type=event_type,
        payload=json.dumps(payload),
        status='pending'
    )
    db.session.add(delivery)
    db.session.commit()
    
    # Generate signature
    signature = generate_signature(webhook.secret, payload)
    
    # Send webhook
    headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event_type,
        'X-Webhook-Delivery-Id': str(delivery.id)
    }
    
    try:
        response = requests.post(
            webhook.url,
            json=payload,
            headers=headers,
            timeout=webhook.timeout_seconds
        )
        
        delivery.status = 'success' if response.status_code < 400 else 'failed'
        delivery.status_code = response.status_code
        delivery.response_body = response.text[:1000]  # Limit response size
        delivery.delivered_at = datetime.utcnow()
        delivery.attempt_count = 1
        
    except Exception as e:
        delivery.status = 'failed'
        delivery.response_body = str(e)[:1000]
        delivery.attempt_count = 1
    
    db.session.commit()
    return delivery

def generate_signature(secret, payload):
    """Generate HMAC signature for webhook"""
    payload_str = json.dumps(payload) if isinstance(payload, dict) else str(payload)
    signature = hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return f"sha256={signature}"

def trigger_webhooks_for_event(event_type, payload, resource_type=None, resource_id=None):
    """Trigger all webhooks subscribed to an event"""
    # Find all active webhooks subscribed to this event
    webhooks = Webhook.query.filter(Webhook.is_active == True).all()
    
    triggered = []
    for webhook in webhooks:
        events = json.loads(webhook.events) if webhook.events else []
        if event_type in events or '*' in events:
            delivery = trigger_webhook(webhook.id, event_type, payload)
            if delivery:
                triggered.append(delivery)
    
    return triggered

