from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from ..schemas.inventory import (
    InventoryCreate,
    InventoryUpdate,
    InventoryResponse,
    InventoryWithDetails
)
from ...db.database import get_db
from ...db.models import Inventory, Product, Store
from sqlalchemy.exc import IntegrityError

router = APIRouter(
    prefix="/inventory",
    tags=["inventory"]
)

@router.post("/", response_model=InventoryResponse, status_code=201)
def create_inventory(inventory: InventoryCreate, db: Session = Depends(get_db)):
    """Create a new inventory record"""
    # Verify product and store exist
    product = db.query(Product).filter(Product.id == inventory.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    store = db.query(Store).filter(Store.id == inventory.store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    db_inventory = Inventory(**inventory.dict())
    try:
        db.add(db_inventory)
        db.commit()
        db.refresh(db_inventory)
        return db_inventory
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Inventory record already exists for this product and store"
        )

@router.get("/", response_model=List[InventoryWithDetails])
def list_inventory(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    store_id: Optional[int] = None,
    product_id: Optional[int] = None,
    low_stock: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """List inventory with optional filtering and pagination"""
    query = db.query(
        Inventory,
        Product.name.label('product_name'),
        Product.sku.label('product_sku'),
        Store.name.label('store_name'),
        Store.location.label('store_location')
    ).join(Product).join(Store)
    
    if store_id:
        query = query.filter(Inventory.store_id == store_id)
    if product_id:
        query = query.filter(Inventory.product_id == product_id)
    if low_stock:
        query = query.filter(
            Inventory.quantity <= Inventory.reorder_point
        )
    
    results = query.offset(skip).limit(limit).all()
    
    return [
        InventoryWithDetails(
            **{
                **inventory.__dict__,
                'product_name': product_name,
                'product_sku': product_sku,
                'store_name': store_name,
                'store_location': store_location
            }
        )
        for inventory, product_name, product_sku, store_name, store_location in results
    ]

@router.get("/{inventory_id}", response_model=InventoryWithDetails)
def get_inventory(inventory_id: int, db: Session = Depends(get_db)):
    """Get a specific inventory record by ID"""
    result = db.query(
        Inventory,
        Product.name.label('product_name'),
        Product.sku.label('product_sku'),
        Store.name.label('store_name'),
        Store.location.label('store_location')
    ).join(Product).join(Store).filter(Inventory.id == inventory_id).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    
    inventory, product_name, product_sku, store_name, store_location = result
    return InventoryWithDetails(
        **{
            **inventory.__dict__,
            'product_name': product_name,
            'product_sku': product_sku,
            'store_name': store_name,
            'store_location': store_location
        }
    )

@router.put("/{inventory_id}", response_model=InventoryResponse)
def update_inventory(
    inventory_id: int,
    inventory_update: InventoryUpdate,
    db: Session = Depends(get_db)
):
    """Update an inventory record"""
    db_inventory = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not db_inventory:
        raise HTTPException(status_code=404, detail="Inventory record not found")

    update_data = inventory_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_inventory, field, value)
    
    db_inventory.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_inventory)
    return db_inventory

@router.delete("/{inventory_id}", status_code=204)
def delete_inventory(inventory_id: int, db: Session = Depends(get_db)):
    """Delete an inventory record"""
    db_inventory = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not db_inventory:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    
    db.delete(db_inventory)
    db.commit()

@router.post("/{inventory_id}/restock", response_model=InventoryResponse)
def restock_inventory(
    inventory_id: int,
    quantity: int = Query(..., gt=0),
    db: Session = Depends(get_db)
):
    """Restock inventory with additional quantity"""
    db_inventory = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not db_inventory:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    
    db_inventory.quantity += quantity
    db_inventory.last_restock_at = datetime.utcnow()
    db_inventory.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_inventory)
    return db_inventory

@router.get("/low-stock/summary", response_model=List[InventoryWithDetails])
def get_low_stock_summary(db: Session = Depends(get_db)):
    """Get a summary of all low stock items across all stores"""
    query = db.query(
        Inventory,
        Product.name.label('product_name'),
        Product.sku.label('product_sku'),
        Store.name.label('store_name'),
        Store.location.label('store_location')
    ).join(Product).join(Store).filter(
        Inventory.quantity <= Inventory.reorder_point
    )
    
    results = query.all()
    
    return [
        InventoryWithDetails(
            **{
                **inventory.__dict__,
                'product_name': product_name,
                'product_sku': product_sku,
                'store_name': store_name,
                'store_location': store_location
            }
        )
        for inventory, product_name, product_sku, store_name, store_location in results
    ] 