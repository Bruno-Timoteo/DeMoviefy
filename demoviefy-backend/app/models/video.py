"""
VIDEO MODEL
-----------
Defines the Video database model for the MVC pattern.
This module represents the video entity stored in the database.
"""

from datetime import datetime
from app import db


class Video(db.Model):
    """
    Video Model - SQLAlchemy ORM Model
    
    Represents a video record in the database with metadata about
    uploaded videos including filename, processing status, and creation timestamp.
    
    Attributes:
        id (int): Unique primary key identifier for the video
        filename (str): Name of the uploaded video file
        status (str): Current processing status (e.g., "PROCESSANDO", "CONCLUIDO", "ERRO")
        created_at (DateTime): Timestamp when the video was uploaded
    """
    __tablename__ = "videos"

    # Primary Key
    id = db.Column(db.Integer, primary_key=True)
    
    # Video Metadata
    filename = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default="PROCESSANDO")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        """
        Convert Video model instance to dictionary.
        
        This method serializes the Video object into a JSON-compatible dictionary
        format for API responses.
        
        Returns:
            dict: Dictionary containing video metadata
                - id (int): Video ID
                - filename (str): Video filename
                - status (str): Processing status
                - created_at (str): ISO format timestamp
        """
        return {
            "id": self.id,
            "filename": self.filename,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
