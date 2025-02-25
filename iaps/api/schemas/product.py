from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProductBase(BaseModel):
    """Base schema for Product shared properties"""
    sku: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None

class ProductCreate(ProductBase):
    """Schema for creating a new product"""
    pass

class ProductUpdate(BaseModel):
    """Schema for updating a product - all fields optional"""
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None

class ProductResponse(ProductBase):
    """Schema for product responses, including database fields"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        """Configure Pydantic to handle ORM objects"""
        orm_mode = True 