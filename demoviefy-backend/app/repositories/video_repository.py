"""
VIDEO REPOSITORY
----------------
Repository layer for Video model CRUD operations.
Handles all database interactions for video records.
Part of the MVC pattern (Model-View-Controller).
"""

from typing import Iterable
from app import db
from app.models.video import Video


def create_video(*, filename: str) -> Video:
    """
    Create a new video record in the database.
    
    Creates a new Video instance with the given filename and saves it
    to the database. The status defaults to "PROCESSANDO" (processing).
    
    Args:
        filename (str): The name of the uploaded video file
        
    Returns:
        Video: The newly created Video object with an assigned ID
        
    Raises:
        SQLAlchemy exceptions if database operation fails
    """
    video = Video(filename=filename)
    db.session.add(video)
    db.session.commit()
    return video


def list_videos() -> list[Video]:
    """
    Retrieve all video records from the database.
    
    Fetches all videos sorted by creation date in descending order
    (newest first).
    
    Returns:
        list[Video]: List of all Video objects in the database.
                     Returns empty list if no videos exist.
    """
    return Video.query.order_by(Video.created_at.desc()).all()


def get_video(video_id: int) -> Video | None:
    """
    Retrieve a single video record by ID.
    
    Fetches a specific video from the database using its primary key ID.
    
    Args:
        video_id (int): The unique identifier of the video to retrieve
        
    Returns:
        Video | None: The Video object if found, None if not found
    """
    return db.session.get(Video, video_id)


def update_status(video: Video, status: str) -> Video:
    """
    Update the processing status of a video.
    
    Updates the status field of an existing video record and persists
    the change to the database. Common status values include:
    - "PROCESSANDO": Currently processing
    - "CONCLUIDO": Processing completed successfully
    - "ERRO": Processing failed
    
    Args:
        video (Video): The video object to update
        status (str): New status value
        
    Returns:
        Video: The updated Video object
    """
    video.status = status
    db.session.commit()
    return video


def delete_video(video: Video) -> None:
    """
    Delete a video record from the database.
    
    Permanently removes a video record from the database. Note that this
    only removes the database record - associated files (video file, analysis,
    annotations) must be deleted separately via file system operations.
    
    Args:
        video (Video): The video object to delete
        
    Returns:
        None
    """
    db.session.delete(video)
    db.session.commit()
