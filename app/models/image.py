from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class ImageDoc(BaseModel):
    id: Optional[str] = None
    userId: str
    productId: Optional[str] = None
    filePath: str
    features: Optional[Dict[str, Any]] = None   # 예: dominant_color, composition_score 등
    ctrScore: Optional[float] = None            # 매력도/CTR 점수
    createdAt: datetime = datetime.utcnow()
