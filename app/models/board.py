from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Reply(BaseModel):
    content: str
    authorId: str
    authorName: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BoardPost(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")   # Mongo _id 매핑
    department: str
    title: str
    content: str
    authorId: str           # ✅ 작성자 employeeId
    authorName: str         # ✅ 작성자 이름
    created_at: datetime = Field(default_factory=datetime.utcnow)
    replies: List[Reply] = Field(default_factory=list)   # ✅ 안전한 리스트 초기화
