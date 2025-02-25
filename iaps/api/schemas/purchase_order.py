from pydantic import BaseModel, conint
from typing import List, Optional
from datetime import datetime
from enum import Enum

class OrderStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    RECEIVED = "received"
    CANCELLED = "cancelled"

class PurchaseOrderItemBase(BaseModel):
    """Base schema for Purchase Order Item shared properties"""
    product_id: int
    quantity: conint(ge=0)  # Ensure quantity is non-negative

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    """Schema for creating a purchase order item"""
    pass

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    """Schema for purchase order item responses"""
    id: int
    purchase_order_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    product_name: Optional[str]
    product_sku: Optional[str]

    class Config:
        from_attributes = True

class PurchaseOrderBase(BaseModel):
    """Base schema for Purchase Order shared properties"""
    store_id: int

class PurchaseOrderCreate(PurchaseOrderBase):
    """Schema for creating a purchase order"""
    items: List[PurchaseOrderItemCreate]

class PurchaseOrderUpdate(BaseModel):
    """Schema for updating a purchase order"""
    status: Optional[OrderStatus]

class PurchaseOrderResponse(PurchaseOrderBase):
    """Schema for purchase order responses"""
    id: int
    status: OrderStatus
    created_at: datetime
    updated_at: Optional[datetime]
    submitted_at: Optional[datetime]
    approved_at: Optional[datetime]
    received_at: Optional[datetime]
    store_name: str
    items: List[PurchaseOrderItemResponse]
    total_items: int

    class Config:
        from_attributes = True

class ReorderCalculation(BaseModel):
    """Schema for reorder calculation request"""
    days_of_sales: int
    store_id: Optional[int]
    product_id: Optional[int]

class ReorderSuggestion(BaseModel):
    """Schema for reorder suggestion response"""
    product_id: int
    product_name: str
    product_sku: str
    store_id: int
    store_name: str
    current_quantity: int
    suggested_order: int
    days_of_sales: int
    total_sales: int
    average_daily_sales: float 