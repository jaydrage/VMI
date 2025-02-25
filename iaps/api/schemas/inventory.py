from pydantic import BaseModel, conint
from typing import Optional
from datetime import datetime

class InventoryBase(BaseModel):
    """Base schema for Inventory shared properties"""
    product_id: int
    store_id: int
    quantity: conint(ge=0)  # Ensure quantity is non-negative
    reorder_point: Optional[conint(ge=0)] = None
    reorder_quantity: Optional[conint(ge=0)] = None

class InventoryCreate(InventoryBase):
    """Schema for creating a new inventory record"""
    pass

class InventoryUpdate(BaseModel):
    """Schema for updating an inventory record - all fields optional"""
    quantity: Optional[conint(ge=0)] = None
    reorder_point: Optional[conint(ge=0)] = None
    reorder_quantity: Optional[conint(ge=0)] = None

class InventoryResponse(InventoryBase):
    """Schema for inventory responses, including database fields"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_restock_at: Optional[datetime] = None

    class Config:
        """Configure Pydantic to handle ORM objects"""
        orm_mode = True

class InventoryWithDetails(InventoryResponse):
    """Schema for inventory responses with product and store details"""
    product_name: str
    product_sku: str
    store_name: str
    store_location: str 