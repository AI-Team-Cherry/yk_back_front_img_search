from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime

class Result(BaseModel):
    id: Optional[str]
    userId: str
    query: str
    output: Dict
    createdAt: datetime = datetime.utcnow()
