from datetime import datetime
from app import db

class Submission(db.Model):
    __tablename__ = 'submissions'
    
    id = db.Column(db.Integer, primary_key=True)
    assignment_doc_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    work_doc_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=True) # Snapshot of work
    
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default='submitted') # 'submitted', 'graded', 'returned'
    
    grade = db.Column(db.Float)
    feedback = db.Column(db.Text)
    rubric_scores = db.Column(db.Text) # JSON string: {criteria_id: score}
    
    is_group = db.Column(db.Boolean, default=False)
    contribution_data = db.Column(db.Text) # JSON string: {user_id: percentage}

    student = db.relationship('User', foreign_keys=[student_id], backref='submissions')
    assignment_doc = db.relationship('Document', foreign_keys=[assignment_doc_id], backref='all_submissions')
    work_doc = db.relationship('Document', foreign_keys=[work_doc_id])

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'assignment_doc_id': self.assignment_doc_id,
            'student_id': self.student_id,
            'work_doc_id': self.work_doc_id,
            'submitted_at': self.submitted_at.isoformat(),
            'status': self.status,
            'grade': self.grade,
            'feedback': self.feedback,
            'rubric_scores': json.loads(self.rubric_scores) if self.rubric_scores else {},
            'is_group': self.is_group,
            'student_name': self.student.username
        }
