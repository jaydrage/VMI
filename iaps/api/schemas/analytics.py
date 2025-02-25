from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime

class ProductPerformance(BaseModel):
    """Schema for product performance metrics"""
    product_id: int
    product_name: str
    product_sku: str
    total_quantity: int
    store_count: int
    low_stock_count: int
    restock_frequency: Optional[float] = None
    avg_quantity: float

class StorePerformance(BaseModel):
    """Schema for store performance metrics"""
    store_id: int
    store_name: str
    store_location: str
    region: Optional[str]
    total_products: int
    total_quantity: int
    low_stock_items: int
    restock_count: int
    inventory_value: float

class RegionalTrends(BaseModel):
    """Schema for regional performance analysis"""
    region: str
    store_count: int
    total_products: int
    total_quantity: int
    avg_products_per_store: float
    low_stock_percentage: float

class InventoryHistory(BaseModel):
    """Schema for historical inventory data"""
    timestamp: datetime
    quantity: int
    restock_event: bool

class ProductHistory(BaseModel):
    """Schema for product history with inventory changes"""
    product_id: int
    product_name: str
    store_id: int
    store_name: str
    history: List[InventoryHistory]

class LowStockPrediction(BaseModel):
    """Schema for low stock predictions"""
    product_id: int
    product_name: str
    store_id: int
    store_name: str
    current_quantity: int
    predicted_days_until_reorder: float
    confidence_score: float
    recommended_restock_date: datetime

class AnalyticsSummary(BaseModel):
    """Schema for overall analytics summary"""
    total_products: int
    total_stores: int
    total_inventory: int
    low_stock_items: int
    inventory_health_score: float
    top_performing_stores: List[str]
    critical_products: List[str]
    regional_distribution: Dict[str, int]

class TimeRange(str):
    """Time range options for trend analysis"""
    DAY = "day"
    WEEK = "week"
    MONTH = "month"

class InventoryTrendPoint(BaseModel):
    """Schema for a single point in trend data"""
    timestamp: datetime
    quantity: int
    restock_count: int
    low_stock_count: int

class ProductTrend(BaseModel):
    """Schema for product-specific trends"""
    product_id: int
    product_name: str
    trend_data: List[InventoryTrendPoint]
    average_quantity: float
    restock_frequency: float
    stock_out_frequency: float

class StoreTrend(BaseModel):
    """Schema for store-specific trends"""
    store_id: int
    store_name: str
    trend_data: List[InventoryTrendPoint]
    average_inventory_level: float
    peak_inventory_date: datetime
    low_inventory_date: datetime

class CategoryTrend(BaseModel):
    """Schema for category-specific trends"""
    category: str
    trend_data: List[InventoryTrendPoint]
    growth_rate: float
    seasonal_pattern: Optional[str]

class TrendAnalysis(BaseModel):
    """Schema for overall trend analysis"""
    time_range: TimeRange
    start_date: datetime
    end_date: datetime
    products: List[ProductTrend]
    stores: List[StoreTrend]
    categories: List[CategoryTrend]
    overall_growth_rate: float
    peak_period: datetime
    low_period: datetime
    recommendations: List[str] 