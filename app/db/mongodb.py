from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from datetime import datetime
from pymongo import ReturnDocument
from app.core.config import MONGO_URI, DB_NAME
from bson import ObjectId
from typing import Optional


client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

users_collection    = db["users"]
products_collection = db["products"]
images_collection   = db["images"]
results_collection  = db["results"]
buyers_collection = db["buyers"]

async def insert_result(doc: dict):
    doc.setdefault("createdAt", datetime.utcnow())
    await results_collection.insert_one(doc)
    return doc

async def run_aggregation(collection: str, pipeline: list):
    col = db[collection]
    cursor = col.aggregate(pipeline)
    return [doc async for doc in cursor]

async def update_user(employeeId: str, update_data: dict):
    update_data["updatedAt"] = datetime.utcnow()
    return await users_collection.find_one_and_update(
        {"employeeId": employeeId},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER
    )

async def update_last_login(employeeId: str):
    return await users_collection.update_one(
        {"employeeId": employeeId},
        {"$set": {"lastLogin": datetime.utcnow(), "updatedAt": datetime.utcnow()}}
    )

async def get_db(db_name: Optional[str] = None) -> AsyncIOMotorDatabase:
    """
    현재 모듈에서 사용하는 전역 Mongo 클라이언트를 활용해 DB 핸들 반환
    """
    from app.core.config import MONGO_URI, DB_NAME
    global _mongo_client
    try:
        _mongo_client
    except NameError:
        _mongo_client = AsyncIOMotorClient(MONGO_URI)
    return _mongo_client[db_name or DB_NAME]

def to_plain_dict(doc):
    """
    FastAPI 응답 직렬화용: ObjectId → str 로 바꿔주는 간단 헬퍼
    """
    if not doc:
        return doc
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        else:
            out[k] = v
    return out

async def get_collection(name: str):
    """
    MongoDB 컬렉션 핸들을 반환
    """
    return db[name]