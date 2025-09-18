from pydantic import BaseModel
from pydantic import EmailStr
from typing import Optional, Dict
from datetime import datetime

class User(BaseModel):
    id: Optional[str]
    employeeId: str
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    role: str = "user"
    password: str
    bio: Optional[str] = None
    profilePicture: Optional[str] = None
    jobTitle: Optional[str] = None
    company: Optional[str] = None
    workLocation: Optional[str] = None
    lastLogin: Optional[datetime] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

class UserOut(BaseModel):
    id: str
    employeeId: str
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    role: str
    bio: Optional[str] = None
    profilePicture: Optional[str] = None
    jobTitle: Optional[str] = None
    company: Optional[str] = None
    workLocation: Optional[str] = None
    lastLogin: Optional[datetime]
    createdAt: Optional[datetime]
    updatedAt: Optional[datetime]

class UserIn(BaseModel):
    employeeId: str
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    role: str = "user"
    password: str
    bio: Optional[str] = None
    profilePicture: Optional[str] = None
    jobTitle: Optional[str] = None
    company: Optional[str] = None
    workLocation: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    profilePicture: Optional[str] = None
    jobTitle: Optional[str] = None
    company: Optional[str] = None
    workLocation: Optional[str] = None