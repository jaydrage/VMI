from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from ..schemas.store import StoreCreate, StoreUpdate, StoreResponse, StoreWithInventoryCount
from ...db.database import get_db
from ...db.models import Store, Inventory
from sqlalchemy.exc import IntegrityError

router = APIRouter(
    prefix="/stores",
    tags=["stores"]
)

@router.post("/", response_model=StoreResponse, status_code=201)
def create_store(store: StoreCreate, db: Session = Depends(get_db)):
    """Create a new store"""
    db_store = Store(**store.dict())
    try:
        db.add(db_store)
        db.commit()
        db.refresh(db_store)
        return db_store
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Store with this name already exists")

@router.get("/", response_model=List[StoreResponse])
def list_stores(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    region: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List stores with optional filtering and pagination"""
    query = db.query(Store)
    
    if region:
        query = query.filter(Store.region == region)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Store.name.ilike(search_filter)) |
            (Store.location.ilike(search_filter))
        )
    
    return query.offset(skip).limit(limit).all()

@router.get("/stats", response_model=List[StoreWithInventoryCount])
def get_stores_with_stats(
    region: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get stores with their inventory statistics"""
    query = db.query(
        Store,
        func.count(func.distinct(Inventory.product_id)).label('total_products'),
        func.sum(Inventory.quantity).label('total_items')
    ).outerjoin(Inventory)
    
    if region:
        query = query.filter(Store.region == region)
    
    results = query.group_by(Store.id).all()
    
    return [
        StoreWithInventoryCount(
            **{
                **store.__dict__,
                'total_products': total_products or 0,
                'total_items': total_items or 0
            }
        )
        for store, total_products, total_items in results
    ]

@router.get("/{store_id}", response_model=StoreResponse)
def get_store(store_id: int, db: Session = Depends(get_db)):
    """Get a specific store by ID"""
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store

@router.get("/{store_id}/stats", response_model=StoreWithInventoryCount)
def get_store_stats(store_id: int, db: Session = Depends(get_db)):
    """Get a specific store's statistics"""
    result = db.query(
        Store,
        func.count(func.distinct(Inventory.product_id)).label('total_products'),
        func.sum(Inventory.quantity).label('total_items')
    ).outerjoin(Inventory).filter(Store.id == store_id).group_by(Store.id).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Store not found")
    
    store, total_products, total_items = result
    return StoreWithInventoryCount(
        **{
            **store.__dict__,
            'total_products': total_products or 0,
            'total_items': total_items or 0
        }
    )

@router.put("/{store_id}", response_model=StoreResponse)
def update_store(
    store_id: int,
    store_update: StoreUpdate,
    db: Session = Depends(get_db)
):
    """Update a store"""
    db_store = db.query(Store).filter(Store.id == store_id).first()
    if not db_store:
        raise HTTPException(status_code=404, detail="Store not found")

    update_data = store_update.dict(exclude_unset=True)
    try:
        for field, value in update_data.items():
            setattr(db_store, field, value)
        db.commit()
        db.refresh(db_store)
        return db_store
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Store with this name already exists")

@router.delete("/{store_id}", status_code=204)
def delete_store(store_id: int, db: Session = Depends(get_db)):
    """Delete a store"""
    db_store = db.query(Store).filter(Store.id == store_id).first()
    if not db_store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    try:
        db.delete(db_store)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Cannot delete store as it has associated inventory records"
        ) 