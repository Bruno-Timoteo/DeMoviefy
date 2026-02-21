from datetime import datetime

from app import db


class Video(db.Model):
    __tablename__ = "videos"

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default="PROCESSANDO")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
