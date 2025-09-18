# app/api/routes/visualization.py
from fastapi import APIRouter, Query
from typing import Any, Dict, List

from app.db.mongodb import db

router = APIRouter(prefix="/visualization", tags=["Visualization"])

@router.get("/chart")
async def get_chart(
    type: str = Query("line", description="차트 타입 (line/bar/pie)"),
    metric: str = Query("sales", description="지표 (sales/orders/customers)")
) -> Dict[str, Any]:
    pipeline = []

    # metric에 따라 Mongo 집계
    if metric == "sales":
        pipeline = [
            {"$group": {"_id": "$order_date", "value": {"$sum": "$total_amount"}}},
            {"$project": {"_id": 0, "label": "$_id", "value": 1}},
            {"$sort": {"label": 1}}
        ]
    elif metric == "orders":
        pipeline = [
            {"$group": {"_id": "$order_date", "value": {"$sum": 1}}},
            {"$project": {"_id": 0, "label": "$_id", "value": 1}},
            {"$sort": {"label": 1}}
        ]
    elif metric == "customers":
        pipeline = [
            {"$group": {"_id": "$order_date", "value": {"$addToSet": "$buyer_id"}}},
            {"$project": {"_id": 0, "label": "$_id", "value": {"$size": "$value"}}},
            {"$sort": {"label": 1}}
        ]

    docs = await db.orders.aggregate(pipeline).to_list(None)

    return {"data": docs}
