from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import GPARecord, User
import json

gpa_bp = Blueprint('gpa', __name__)


@gpa_bp.route('', methods=['GET'])
@jwt_required()
def get_gpa():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    record = GPARecord.query.filter_by(user_id=current_user_id).order_by(GPARecord.id.desc()).first()
    if not record:
        return jsonify({'data': None}), 200
    return jsonify(record.to_dict()), 200


@gpa_bp.route('', methods=['PUT', 'POST'])
@jwt_required()
def save_gpa():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    try:
        payload = request.get_json() or {}
    except Exception:
        return jsonify({'error': 'Invalid JSON body'}), 400

    # Persist as JSON string
    try:
        data_str = json.dumps(payload)
    except Exception:
        return jsonify({'error': 'Failed to serialize payload'}), 400

    # Upsert semantics: if existing record, update the latest; otherwise create
    existing = GPARecord.query.filter_by(user_id=current_user_id).order_by(GPARecord.id.desc()).first()
    if existing:
        existing.data = data_str
        db.session.commit()
        return jsonify(existing.to_dict()), 200
    else:
        record = GPARecord(user_id=current_user_id, data=data_str)
        db.session.add(record)
        db.session.commit()
        return jsonify(record.to_dict()), 201
