import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getAnalyticsSummary, getRegionalTrends, getProductPerformance } from '../services/api';

interface AnalyticsSummary {
  total_products: number;
  total_stores: number;
  total_inventory: number;
  low_stock_items: number;
  inventory_health_score: number;
  top_performing_stores: string[];
  critical_products: string[];
  regional_distribution: Record<string, number>;
}

interface RegionalTrend {
  region: string;
  store_count: number;
  total_products: number;
  total_quantity: number;
  avg_products_per_store: number;
  low_stock_percentage: number;
}

interface ProductPerformance {
  product_id: number;
  product_name: string;
  product_sku: string;
  total_quantity: number;
  store_count: number;
  low_stock_count: number;
  avg_quantity: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ['analytics-summary'],
    queryFn: () => getAnalyticsSummary().then(res => res.data)
  });

  const { data: regionalTrends, isLoading: trendsLoading } = useQuery<RegionalTrend[]>({
    queryKey: ['regional-trends'],
    queryFn: () => getRegionalTrends().then(res => res.data)
  });

  const { data: productPerformance, isLoading: performanceLoading } = useQuery<ProductPerformance[]>({
    queryKey: ['product-performance'],
    queryFn: () => getProductPerformance().then(res => res.data)
  });

  if (summaryLoading || trendsLoading || performanceLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  const summaryCards = [
    { title: 'Total Products', value: summary?.total_products ?? 0 },
    { title: 'Total Stores', value: summary?.total_stores ?? 0 },
    { title: 'Total Inventory', value: summary?.total_inventory ?? 0 },
    { title: 'Low Stock Items', value: summary?.low_stock_items ?? 0 },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        {summaryCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {card.title}
                </Typography>
                <Typography variant="h5">
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Regional Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Regional Distribution
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={regionalTrends ?? []}
                  dataKey="total_products"
                  nameKey="region"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {regionalTrends?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Product Performance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Product Performance
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={productPerformance ?? []}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_quantity" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Critical Products */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Critical Products
            </Typography>
            <Grid container spacing={2}>
              {summary?.critical_products.map((product: string) => (
                <Grid item xs={12} sm={6} md={4} key={product}>
                  <Card>
                    <CardContent>
                      <Typography color="error">
                        {product}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 
