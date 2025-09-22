from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from app.db.mongodb import db
from app.models.user import User, UserOut, UserIn, UserUpdate
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.post("/register", response_model=UserOut)
async def register(user: UserIn):
    # 이미 존재하는 employeeId 체크
    existing = await db.users.find_one({"employeeId": user.employeeId})
    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 사용자입니다.")

    # 패스워드 해싱
    hashed_pw = hash_password(user.password)

    # MongoDB에 저장할 dict (id 대신 _id)
    doc = {
        "employeeId": user.employeeId,
        "name": user.name,
        "department": user.department,
        "role": user.role,
        "password": hashed_pw,
        "lastLogin": None,
    }
    result = await db.users.insert_one(doc)

    return UserOut(
        id=str(result.inserted_id),
        employeeId=user.employeeId,
        name=user.name,
        department=user.department,
        role=user.role,
        lastLogin=None,
    )

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.users.find_one({"employeeId": form_data.username})
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": str(user["_id"]), "employeeId": user["employeeId"]})
    return {"access_token": token, "token_type": "bearer"}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # DB에서 유저 가져오기
    user = await db.users.find_one({"employeeId": payload.get("employeeId")})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": str(user["_id"]),
        "employeeId": user["employeeId"],
        "name": user.get("name"),
        "email": user.get("email"),
        "phone": user.get("phone"),
        "department": user.get("department"),
        "role": user.get("role"),
        "bio": user.get("bio"),
        "profilePicture": user.get("profilePicture"),
        "jobTitle": user.get("jobTitle"),
        "company": user.get("company"),
        "workLocation": user.get("workLocation"),
        "lastLogin": user.get("lastLogin"),
        "createdAt": user.get("createdAt"),
        "updatedAt": user.get("updatedAt"),
    }

@router.get("/me")
async def get_me(current_user = Depends(get_current_user)):
    return current_user

@router.put("/profile")
async def update_profile(user_update: UserUpdate, token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")

    # 업데이트할 데이터 준비 (None이 아닌 값만)
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updatedAt"] = datetime.utcnow()
    
    # MongoDB 업데이트
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 업데이트된 유저 정보 반환
    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    return {
        "id": str(updated_user["_id"]),
        "employeeId": updated_user["employeeId"],
        "name": updated_user.get("name"),
        "email": updated_user.get("email"),
        "phone": updated_user.get("phone"),
        "department": updated_user.get("department"),
        "role": updated_user.get("role"),
        "bio": updated_user.get("bio"),
        "profilePicture": updated_user.get("profilePicture"),
        "jobTitle": updated_user.get("jobTitle"),
        "company": updated_user.get("company"),
        "workLocation": updated_user.get("workLocation"),
        "lastLogin": updated_user.get("lastLogin"),
        "createdAt": updated_user.get("createdAt"),
        "updatedAt": updated_user.get("updatedAt"),
    }