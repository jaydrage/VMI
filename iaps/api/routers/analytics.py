from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc, extract
from typing import List, Optional
from datetime import datetime, timedelta
from ..schemas.analytics import (
    ProductPerformance,
    StorePerformance,
    RegionalTrends,
    ProductHistory,
    LowStockPrediction,
    AnalyticsSummary,
    TimeRange,
    TrendAnalysis,
    ProductTrend,
    StoreTrend,
    CategoryTrend,
    InventoryTrendPoint
)
from ...db.database import get_db
from ...db.models import Product, Store, Inventory

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"]
)

@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(db: Session = Depends(get_db)):
    """Get overall analytics summary"""
    # Get basic counts
    total_products = db.query(func.count(Product.id)).scalar()
    total_stores = db.query(func.count(Store.id)).scalar()
    total_inventory = db.query(func.sum(Inventory.quantity)).scalar() or 0
    
    # Get low stock items count
    low_stock = db.query(func.count(Inventory.id))\
        .filter(Inventory.quantity <= Inventory.reorder_point).scalar() or 0
    
    # Calculate inventory health score (example: ratio of healthy stock to total)
    total_items = db.query(func.count(Inventory.id)).scalar() or 1  # Avoid division by zero
    health_score = (total_items - low_stock) / total_items * 100
    
    # Get top performing stores (by inventory turnover)
    top_stores = db.query(Store.name)\
        .join(Inventory)\
        .group_by(Store.id)\
        .order_by(desc(func.sum(Inventory.quantity)))\
        .limit(5)\
        .all()
    
    # Get critical products (frequently low stock)
    critical_products = db.query(Product.name)\
        .join(Inventory)\
        .filter(Inventory.quantity <= Inventory.reorder_point)\
        .group_by(Product.id)\
        .order_by(desc(func.count(Inventory.id)))\
        .limit(5)\
        .all()
    
    # Get regional distribution
    regional_dist = dict(
        db.query(Store.region, func.count(Store.id))
        .group_by(Store.region)
        .all()
    )
    
    return AnalyticsSummary(
        total_products=total_products,
        total_stores=total_stores,
        total_inventory=total_inventory,
        low_stock_items=low_stock,
        inventory_health_score=health_score,
        top_performing_stores=[store[0] for store in top_stores],
        critical_products=[prod[0] for prod in critical_products],
        regional_distribution=regional_dist
    )

@router.get("/products/performance", response_model=List[ProductPerformance])
def get_product_performance(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get performance metrics for all products"""
    query = db.query(
        Product.id,
        Product.name,
        Product.sku,
        func.sum(Inventory.quantity).label('total_quantity'),
        func.count(func.distinct(Inventory.store_id)).label('store_count'),
        func.sum(
            case(
                [(Inventory.quantity <= Inventory.reorder_point, 1)],
                else_=0
            )
        ).label('low_stock_count'),
        func.avg(Inventory.quantity).label('avg_quantity')
    ).join(Inventory)
    
    if category:
        query = query.filter(Product.category == category)
    
    results = query.group_by(Product.id).all()
    
    return [
        ProductPerformance(
            product_id=r[0],
            product_name=r[1],
            product_sku=r[2],
            total_quantity=r[3] or 0,
            store_count=r[4] or 0,
            low_stock_count=r[5] or 0,
            avg_quantity=float(r[6] or 0)
        )
        for r in results
    ]

@router.get("/stores/performance", response_model=List[StorePerformance])
def get_store_performance(
    region: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get performance metrics for all stores"""
    query = db.query(
        Store.id,
        Store.name,
        Store.location,
        Store.region,
        func.count(func.distinct(Inventory.product_id)).label('total_products'),
        func.sum(Inventory.quantity).label('total_quantity'),
        func.sum(
            case(
                [(Inventory.quantity <= Inventory.reorder_point, 1)],
                else_=0
            )
        ).label('low_stock_items'),
        func.count(Inventory.last_restock_at).label('restock_count')
    ).join(Inventory)
    
    if region:
        query = query.filter(Store.region == region)
    
    results = query.group_by(Store.id).all()
    
    return [
        StorePerformance(
            store_id=r[0],
            store_name=r[1],
            store_location=r[2],
            region=r[3],
            total_products=r[4] or 0,
            total_quantity=r[5] or 0,
            low_stock_items=r[6] or 0,
            restock_count=r[7] or 0,
            inventory_value=0.0  # Placeholder for future price implementation
        )
        for r in results
    ]

@router.get("/regional/trends", response_model=List[RegionalTrends])
def get_regional_trends(db: Session = Depends(get_db)):
    """Get performance trends by region"""
    results = db.query(
        Store.region,
        func.count(func.distinct(Store.id)).label('store_count'),
        func.count(func.distinct(Inventory.product_id)).label('total_products'),
        func.sum(Inventory.quantity).label('total_quantity'),
        func.sum(
            case(
                [(Inventory.quantity <= Inventory.reorder_point, 1)],
                else_=0
            )
        ).label('low_stock_count')
    ).join(Inventory)\
    .group_by(Store.region)\
    .all()
    
    return [
        RegionalTrends(
            region=r[0] or "Unspecified",
            store_count=r[1] or 0,
            total_products=r[2] or 0,
            total_quantity=r[3] or 0,
            avg_products_per_store=float(r[2] or 0) / float(r[1] or 1),
            low_stock_percentage=float(r[4] or 0) / float(r[2] or 1) * 100
        )
        for r in results
    ]

@router.get("/products/{product_id}/predictions", response_model=List[LowStockPrediction])
def get_product_predictions(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Get low stock predictions for a product across all stores"""
    # Get current inventory levels
    inventories = db.query(
        Inventory,
        Product.name.label('product_name'),
        Store.name.label('store_name')
    ).join(Product)\
    .join(Store)\
    .filter(Inventory.product_id == product_id)\
    .all()
    
    predictions = []
    for inv, product_name, store_name in inventories:
        # Simple prediction logic (to be replaced with ML model)
        current_quantity = inv.quantity
        reorder_point = inv.reorder_point or 10
        daily_usage = 1  # Placeholder for actual usage calculation
        
        days_until_reorder = (current_quantity - reorder_point) / daily_usage if daily_usage > 0 else 30
        
        predictions.append(
            LowStockPrediction(
                product_id=product_id,
                product_name=product_name,
                store_id=inv.store_id,
                store_name=store_name,
                current_quantity=current_quantity,
                predicted_days_until_reorder=max(0, days_until_reorder),
                confidence_score=0.8,  # Placeholder for ML model confidence
                recommended_restock_date=datetime.utcnow() + timedelta(days=int(days_until_reorder))
            )
        )
    
    return predictions

@router.get("/trends", response_model=TrendAnalysis)
def get_trend_analysis(
    time_range: TimeRange,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    category: Optional[str] = None,
    store_id: Optional[int] = None,
    product_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get trend analysis for specified time range"""
    # Set default date range if not provided
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        if time_range == TimeRange.DAY:
            start_date = end_date - timedelta(days=30)  # Last 30 days
        elif time_range == TimeRange.WEEK:
            start_date = end_date - timedelta(weeks=12)  # Last 12 weeks
        else:  # MONTH
            start_date = end_date - timedelta(days=365)  # Last 12 months

    # Base query for inventory changes
    base_query = db.query(
        Inventory,
        Product.name.label('product_name'),
        Product.category,
        Store.name.label('store_name')
    ).join(Product).join(Store)

    # Apply filters
    if category:
        base_query = base_query.filter(Product.category == category)
    if store_id:
        base_query = base_query.filter(Store.id == store_id)
    if product_id:
        base_query = base_query.filter(Product.id == product_id)

    # Get all inventory records within date range
    inventory_records = base_query.filter(
        Inventory.updated_at.between(start_date, end_date)
    ).order_by(Inventory.updated_at).all()

    # Process product trends
    product_trends = []
    products = {}
    for record in inventory_records:
        inv, prod_name, category, store_name = record
        if inv.product_id not in products:
            products[inv.product_id] = {
                'name': prod_name,
                'trend_data': [],
                'total_quantity': 0,
                'restock_count': 0,
                'stock_out_count': 0
            }
        
        products[inv.product_id]['trend_data'].append(
            InventoryTrendPoint(
                timestamp=inv.updated_at,
                quantity=inv.quantity,
                restock_count=1 if inv.last_restock_at else 0,
                low_stock_count=1 if inv.quantity <= inv.reorder_point else 0
            )
        )
        products[inv.product_id]['total_quantity'] += inv.quantity
        if inv.last_restock_at:
            products[inv.product_id]['restock_count'] += 1
        if inv.quantity == 0:
            products[inv.product_id]['stock_out_count'] += 1

    for prod_id, data in products.items():
        num_periods = len(data['trend_data'])
        product_trends.append(
            ProductTrend(
                product_id=prod_id,
                product_name=data['name'],
                trend_data=data['trend_data'],
                average_quantity=data['total_quantity'] / num_periods if num_periods > 0 else 0,
                restock_frequency=data['restock_count'] / num_periods if num_periods > 0 else 0,
                stock_out_frequency=data['stock_out_count'] / num_periods if num_periods > 0 else 0
            )
        )

    # Process store trends
    store_trends = []
    stores = {}
    for record in inventory_records:
        inv, prod_name, category, store_name = record
        if inv.store_id not in stores:
            stores[inv.store_id] = {
                'name': store_name,
                'trend_data': [],
                'total_quantity': 0,
                'quantities': []
            }
        
        stores[inv.store_id]['trend_data'].append(
            InventoryTrendPoint(
                timestamp=inv.updated_at,
                quantity=inv.quantity,
                restock_count=1 if inv.last_restock_at else 0,
                low_stock_count=1 if inv.quantity <= inv.reorder_point else 0
            )
        )
        stores[inv.store_id]['quantities'].append((inv.updated_at, inv.quantity))

    for store_id, data in stores.items():
        quantities = sorted(data['quantities'], key=lambda x: x[1])
        store_trends.append(
            StoreTrend(
                store_id=store_id,
                store_name=data['name'],
                trend_data=data['trend_data'],
                average_inventory_level=sum(q[1] for q in quantities) / len(quantities) if quantities else 0,
                peak_inventory_date=quantities[-1][0] if quantities else start_date,
                low_inventory_date=quantities[0][0] if quantities else start_date
            )
        )

    # Process category trends
    category_trends = []
    categories = {}
    for record in inventory_records:
        inv, prod_name, category, store_name = record
        if not category:
            category = "Uncategorized"
        
        if category not in categories:
            categories[category] = {
                'trend_data': [],
                'quantities': []
            }
        
        categories[category]['trend_data'].append(
            InventoryTrendPoint(
                timestamp=inv.updated_at,
                quantity=inv.quantity,
                restock_count=1 if inv.last_restock_at else 0,
                low_stock_count=1 if inv.quantity <= inv.reorder_point else 0
            )
        )
        categories[category]['quantities'].append((inv.updated_at, inv.quantity))

    for cat_name, data in categories.items():
        quantities = sorted(data['quantities'], key=lambda x: x[0])
        if len(quantities) >= 2:
            start_qty = quantities[0][1]
            end_qty = quantities[-1][1]
            growth_rate = ((end_qty - start_qty) / start_qty) * 100 if start_qty > 0 else 0
        else:
            growth_rate = 0

        category_trends.append(
            CategoryTrend(
                category=cat_name,
                trend_data=data['trend_data'],
                growth_rate=growth_rate,
                seasonal_pattern=None  # Would require more sophisticated analysis
            )
        )

    # Calculate overall metrics
    all_quantities = [(r[0].updated_at, r[0].quantity) for r in inventory_records]
    if all_quantities:
        all_quantities.sort(key=lambda x: x[1])
        peak_period = all_quantities[-1][0]
        low_period = all_quantities[0][0]
        
        all_quantities.sort(key=lambda x: x[0])
        if len(all_quantities) >= 2:
            start_qty = all_quantities[0][1]
            end_qty = all_quantities[-1][1]
            overall_growth_rate = ((end_qty - start_qty) / start_qty) * 100 if start_qty > 0 else 0
        else:
            overall_growth_rate = 0
    else:
        peak_period = end_date
        low_period = start_date
        overall_growth_rate = 0

    # Generate recommendations based on trends
    recommendations = []
    for product in product_trends:
        if product.stock_out_frequency > 0.1:  # More than 10% stock outs
            recommendations.append(
                f"Increase reorder point for {product.product_name} to reduce stock outs"
            )
        if product.restock_frequency > 0.5:  # Restocking more than 50% of the time
            recommendations.append(
                f"Review reorder quantity for {product.product_name} to optimize restocking frequency"
            )

    return TrendAnalysis(
        time_range=time_range,
        start_date=start_date,
        end_date=end_date,
        products=product_trends,
        stores=store_trends,
        categories=category_trends,
        overall_growth_rate=overall_growth_rate,
        peak_period=peak_period,
        low_period=low_period,
        recommendations=recommendations
    )

@router.get("/trends/daily-summary", response_model=List[InventoryTrendPoint])
def get_daily_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    store_id: Optional[int] = None,
    product_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get daily summary of inventory changes"""
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    query = db.query(
        func.date_trunc('day', Inventory.updated_at).label('day'),
        func.sum(Inventory.quantity).label('quantity'),
        func.count(Inventory.last_restock_at).label('restock_count'),
        func.sum(case([(Inventory.quantity <= Inventory.reorder_point, 1)], else_=0)).label('low_stock_count')
    )

    if store_id:
        query = query.filter(Inventory.store_id == store_id)
    if product_id:
        query = query.filter(Inventory.product_id == product_id)

    results = query.filter(
        Inventory.updated_at.between(start_date, end_date)
    ).group_by(
        func.date_trunc('day', Inventory.updated_at)
    ).order_by(
        func.date_trunc('day', Inventory.updated_at)
    ).all()

    return [
        InventoryTrendPoint(
            timestamp=day,
            quantity=quantity or 0,
            restock_count=restock_count or 0,
            low_stock_count=low_stock_count or 0
        )
        for day, quantity, restock_count, low_stock_count in results
    ] 