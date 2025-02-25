from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import product, store, inventory, analytics

app = FastAPI(
    title="Inventory Analytics & Prediction System",
    description="A data-driven inventory management system that analyzes product trends and provides AI-powered reorder suggestions",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(product.router)
app.include_router(store.router)
app.include_router(inventory.router)
app.include_router(analytics.router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to IAPS API",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0"
    } 