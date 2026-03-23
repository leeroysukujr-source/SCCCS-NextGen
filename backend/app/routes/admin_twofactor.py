from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import TwoFactorAudit, User
from app.utils.roles import is_at_least_admin
from app import db
from functools import wraps

admin_tf_bp = Blueprint('admin_twofactor', __name__)

def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        uid = get_jwt_identity()
        user = User.query.get(uid)
        if not is_at_least_admin(user):
            return jsonify({'error': 'Forbidden'}), 403
        return f(*args, **kwargs)
    return wrapper


@admin_tf_bp.route('/twofactor/audits', methods=['GET'])
@jwt_required()
@admin_required
def list_twofactor_audits():
    # Pagination
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 25))
    except ValueError:
        page = 1
        per_page = 25

    q = TwoFactorAudit.query.order_by(TwoFactorAudit.created_at.desc())

    # Optional filters
    user_id = request.args.get('user_id')
    action = request.args.get('action')
    success = request.args.get('success')
    if user_id:
        q = q.filter(TwoFactorAudit.user_id == int(user_id))
    if action:
        q = q.filter(TwoFactorAudit.action == action)
    if success in ['0', '1']:
        q = q.filter(TwoFactorAudit.success == (success == '1'))

    pag = q.paginate(page=page, per_page=per_page, error_out=False)
    items = [i.to_dict() for i in pag.items]
    return jsonify({
        'items': items,
        'page': pag.page,
        'per_page': pag.per_page,
        'total': pag.total,
        'pages': pag.pages
    }), 200



@admin_tf_bp.route('/twofactor/audits/export', methods=['GET'])
@jwt_required()
@admin_required
def export_twofactor_audits():
    # export CSV for filters/date range
    user_id = request.args.get('user_id')
    action = request.args.get('action')
    success = request.args.get('success')
    start = request.args.get('start')  # ISO date
    end = request.args.get('end')

    q = TwoFactorAudit.query.order_by(TwoFactorAudit.created_at.desc())
    if user_id:
        q = q.filter(TwoFactorAudit.user_id == int(user_id))
    if action:
        q = q.filter(TwoFactorAudit.action == action)
    if success in ['0', '1']:
        q = q.filter(TwoFactorAudit.success == (success == '1'))
    if start:
        try:
            from datetime import datetime
            q = q.filter(TwoFactorAudit.created_at >= datetime.fromisoformat(start))
        except Exception:
            pass
    if end:
        try:
            from datetime import datetime
            q = q.filter(TwoFactorAudit.created_at <= datetime.fromisoformat(end))
        except Exception:
            pass

    rows = q.all()

    # Build CSV
    import csv
    from io import StringIO
    si = StringIO()
    writer = csv.writer(si)
    writer.writerow(['id','user_id','action','success','ip_address','user_agent','details','created_at'])
    for r in rows:
        writer.writerow([
            r.id,
            r.user_id,
            r.action,
            '1' if r.success else '0',
            r.ip_address or '',
            (r.user_agent or '').replace('\n',' '),
            (r.details or '').replace('\n',' '),
            r.created_at.isoformat() if r.created_at else ''
        ])

    output = si.getvalue()
    return (output, 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="twofactor_audits.csv"'
    })
