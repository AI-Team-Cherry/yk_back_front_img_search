# app/models/board_reply.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BoardReply(BaseModel):
    id: Optional[str] = Field(alias="_id")
    post_id: str
    department: str
    author: str
    role: Optional[str] = "employee"   # 예: "mentor", "manager"
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    vector: Optional[list] = None
