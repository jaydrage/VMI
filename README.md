# Inventory Analytics & Prediction System (IAPS)

A data-driven inventory management system that analyzes product trends and provides AI-powered reorder suggestions based on historical data from the iQmetrix API.

## Project Overview

This system:
- Pulls daily inventory and product data from iQmetrix API
- Stores historical inventory data
- Analyzes trends using AI/ML models
- Generates smart reorder suggestions
- Provides insights at store, regional, and global levels

## Technology Stack

### Backend
- **Python** - Primary programming language
- **FastAPI** - Modern, fast web framework
- **PostgreSQL** - Primary database (handles time-series data well)
- **SQLAlchemy** - ORM for database operations

### Data Processing & AI
- **pandas** - Data manipulation and analysis
- **scikit-learn** - Basic ML operations
- **Prophet** (by Facebook) - Time series forecasting
- **Apache Airflow** - Workflow automation for daily data pulls

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## Project Structure

## Features

- **Data Collection**
  - Daily automated pulls from iQmetrix API
  - Historical data storage
  - Data validation and cleaning

- **Analysis**
  - Product trend analysis
  - Regional performance insights
  - Store-level analytics
  - Seasonal pattern detection

- **Predictions**
  - AI-powered reorder suggestions
  - Demand forecasting
  - Stock optimization recommendations

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials
3. Run `docker-compose up`
4. Access the dashboard at `http://localhost:8000`

## Configuration

Create a `.env` file with:

## Development

1. Install dependencies:

```bash:README.md
pip install -r requirements.txt
```

2. Run migrations:
```bash
alembic upgrade head
```

3. Start the development server:
```bash
uvicorn api.main:app --reload
```

## Deployment

Basic deployment using Docker:

```bash
docker-compose up -d
```

## Future Enhancements

- Advanced ML model integration
- Real-time analytics
- Mobile application
- Email/Slack notifications
- Custom reporting

## License

MIT
