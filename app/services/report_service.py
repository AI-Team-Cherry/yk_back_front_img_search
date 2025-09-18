"""
리포트 생성 서비스
"""

from typing import Dict, Any
from datetime import datetime

def generate_report(title: str, analysis_result: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "title": title,
        "createdAt": datetime.utcnow(),
        "summary": analysis_result.get("summary", ""),
        "details": {
            "insights": analysis_result.get("insights", ""),
            "recommendations": analysis_result.get("recommendations", [])
        }
    }
