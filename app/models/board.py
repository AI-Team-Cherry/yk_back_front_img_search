from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

class BoardPost(BaseModel):
    id: Optional[str] = Field(alias="_id")
    department: str  # "MD", "CS", "SW" 등
    title: str
    content: str
    author: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    replies: List[dict] = []  # {"author": str, "content": str, "created_at": datetime}
