from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class StoreBase(BaseModel):
    """Base schema for Store shared properties"""
    name: str
    location: str
    region: Optional[str] = None

class StoreCreate(StoreBase):
    """Schema for creating a new store"""
    pass

class StoreUpdate(BaseModel):
    """Schema for updating a store - all fields optional"""
    name: Optional[str] = None
    location: Optional[str] = None
    region: Optional[str] = None

class StoreResponse(StoreBase):
    """Schema for store responses, including database fields"""
    id: int
    created_at: datetime

    class Config:
        """Configure Pydantic to handle ORM objects"""
        orm_mode = True

class StoreWithInventoryCount(StoreResponse):
    """Schema for store responses with inventory count"""
    total_products: int
    total_items: int 