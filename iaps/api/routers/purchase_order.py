from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from ..schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderResponse,
    ReorderCalculation,
    ReorderSuggestion,
    OrderStatus
)
from ...db.database import get_db
from ...db.models import PurchaseOrder, PurchaseOrderItem, Product, Store, Inventory, SalesHistory

router = APIRouter(
    prefix="/purchase-orders",
    tags=["purchase-orders"]
)

@router.post("/", response_model=PurchaseOrderResponse, status_code=201)
def create_purchase_order(order: PurchaseOrderCreate, db: Session = Depends(get_db)):
    """Create a new purchase order"""
    # Verify store exists
    store = db.query(Store).filter(Store.id == order.store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Create purchase order
    db_order = PurchaseOrder(store_id=order.store_id)
    db.add(db_order)
    db.flush()  # Get the order ID
    
    # Create order items
    total_items = 0
    for item in order.items:
        # Verify product exists
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        db_item = PurchaseOrderItem(
            purchase_order_id=db_order.id,
            product_id=item.product_id,
            quantity=item.quantity
        )
        db.add(db_item)
        total_items += item.quantity
    
    try:
        db.commit()
        # Fetch the complete order with items
        result = db.query(
            PurchaseOrder,
            Store.name.label('store_name')
        ).join(Store).filter(PurchaseOrder.id == db_order.id).first()
        
        order_items = db.query(
            PurchaseOrderItem,
            Product.name.label('product_name'),
            Product.sku.label('product_sku')
        ).join(Product).filter(PurchaseOrderItem.purchase_order_id == db_order.id).all()
        
        # Construct response
        order_dict = result[0].__dict__
        order_dict['store_name'] = result[1]
        order_dict['total_items'] = total_items
        order_dict['items'] = [
            {
                **item[0].__dict__,
                'product_name': item[1],
                'product_sku': item[2]
            }
            for item in order_items
        ]
        
        return order_dict
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[PurchaseOrderResponse])
def list_purchase_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    store_id: Optional[int] = None,
    status: Optional[OrderStatus] = None,
    db: Session = Depends(get_db)
):
    """List purchase orders with optional filtering"""
    query = db.query(
        PurchaseOrder,
        Store.name.label('store_name'),
        func.sum(PurchaseOrderItem.quantity).label('total_items')
    ).join(Store).outerjoin(PurchaseOrderItem).group_by(PurchaseOrder.id, Store.name)
    
    if store_id:
        query = query.filter(PurchaseOrder.store_id == store_id)
    if status:
        query = query.filter(PurchaseOrder.status == status)
    
    results = query.offset(skip).limit(limit).all()
    
    orders = []
    for order, store_name, total_items in results:
        # Fetch items for each order
        items = db.query(
            PurchaseOrderItem,
            Product.name.label('product_name'),
            Product.sku.label('product_sku')
        ).join(Product).filter(PurchaseOrderItem.purchase_order_id == order.id).all()
        
        order_dict = order.__dict__
        order_dict['store_name'] = store_name
        order_dict['total_items'] = total_items or 0
        order_dict['items'] = [
            {
                **item[0].__dict__,
                'product_name': item[1],
                'product_sku': item[2]
            }
            for item in items
        ]
        orders.append(order_dict)
    
    return orders

@router.get("/{order_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(order_id: int, db: Session = Depends(get_db)):
    """Get a specific purchase order"""
    result = db.query(
        PurchaseOrder,
        Store.name.label('store_name'),
        func.sum(PurchaseOrderItem.quantity).label('total_items')
    ).join(Store).outerjoin(PurchaseOrderItem).filter(
        PurchaseOrder.id == order_id
    ).group_by(PurchaseOrder.id, Store.name).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    order, store_name, total_items = result
    
    # Fetch items
    items = db.query(
        PurchaseOrderItem,
        Product.name.label('product_name'),
        Product.sku.label('product_sku')
    ).join(Product).filter(PurchaseOrderItem.purchase_order_id == order_id).all()
    
    order_dict = order.__dict__
    order_dict['store_name'] = store_name
    order_dict['total_items'] = total_items or 0
    order_dict['items'] = [
        {
            **item[0].__dict__,
            'product_name': item[1],
            'product_sku': item[2]
        }
        for item in items
    ]
    
    return order_dict

@router.put("/{order_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(order_id: int, order_update: PurchaseOrderUpdate, db: Session = Depends(get_db)):
    """Update a purchase order's status"""
    db_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if order_update.status:
        # Update status and corresponding timestamp
        db_order.status = order_update.status
        if order_update.status == OrderStatus.SUBMITTED:
            db_order.submitted_at = datetime.utcnow()
        elif order_update.status == OrderStatus.APPROVED:
            db_order.approved_at = datetime.utcnow()
        elif order_update.status == OrderStatus.RECEIVED:
            db_order.received_at = datetime.utcnow()
            # Update inventory when order is received
            items = db.query(PurchaseOrderItem).filter(
                PurchaseOrderItem.purchase_order_id == order_id
            ).all()
            for item in items:
                inventory = db.query(Inventory).filter(
                    Inventory.product_id == item.product_id,
                    Inventory.store_id == db_order.store_id
                ).first()
                if inventory:
                    inventory.quantity += item.quantity
                    inventory.last_restock_at = datetime.utcnow()
                else:
                    # Create new inventory record if it doesn't exist
                    new_inventory = Inventory(
                        product_id=item.product_id,
                        store_id=db_order.store_id,
                        quantity=item.quantity,
                        last_restock_at=datetime.utcnow()
                    )
                    db.add(new_inventory)
    
    db.commit()
    db.refresh(db_order)
    
    # Fetch complete order details
    return get_purchase_order(order_id, db)

@router.post("/calculate-reorder", response_model=List[ReorderSuggestion])
def calculate_reorder(calculation: ReorderCalculation, db: Session = Depends(get_db)):
    """Calculate reorder quantities based on sales history"""
    # Base query for inventory
    query = db.query(
        Inventory,
        Product.name.label('product_name'),
        Product.sku.label('product_sku'),
        Store.name.label('store_name')
    ).join(Product).join(Store)
    
    # Apply filters
    if calculation.store_id:
        query = query.filter(Inventory.store_id == calculation.store_id)
    if calculation.product_id:
        query = query.filter(Inventory.product_id == calculation.product_id)
    
    inventory_records = query.all()
    suggestions = []
    
    for inv, prod_name, prod_sku, store_name in inventory_records:
        # Get sales history for the specified period
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=calculation.days_of_sales)
        
        sales = db.query(func.sum(SalesHistory.quantity_sold).label('total_sales')).filter(
            SalesHistory.product_id == inv.product_id,
            SalesHistory.store_id == inv.store_id,
            SalesHistory.sale_date.between(start_date, end_date)
        ).scalar()
        
        total_sales = sales or 0
        avg_daily_sales = total_sales / calculation.days_of_sales if total_sales > 0 else 0
        
        # Calculate suggested order quantity
        suggested_order = max(0, total_sales - inv.quantity)
        
        if suggested_order > 0:  # Only include items that need reordering
            suggestions.append(
                ReorderSuggestion(
                    product_id=inv.product_id,
                    product_name=prod_name,
                    product_sku=prod_sku,
                    store_id=inv.store_id,
                    store_name=store_name,
                    current_quantity=inv.quantity,
                    suggested_order=suggested_order,
                    days_of_sales=calculation.days_of_sales,
                    total_sales=total_sales,
                    average_daily_sales=avg_daily_sales
                )
            )
    
    return sorted(suggestions, key=lambda x: x.suggested_order, reverse=True) 