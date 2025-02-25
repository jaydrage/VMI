import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  getAnalyticsSummary,
  getProductPerformance,
  getStorePerformance,
  getRegionalTrends,
  getTrendAnalysis,
  getDailySummary,
} from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface RegionalTrend {
  region: string;
  store_count: number;
  total_products: number;
  total_quantity: number;
  avg_products_per_store: number;
  low_stock_percentage: number;
}

interface TrendAnalysisData {
  time_range: string;
  start_date: string;
  end_date: string;
  overall_growth_rate: number;
  peak_period: string;
  low_period: string;
  categories: Array<{
    category: string;
    growth_rate: number;
  }>;
  recommendations: string[];
}

interface DailySummaryPoint {
  timestamp: string;
  quantity: number;
  restock_count: number;
  low_stock_count: number;
}

export default function Analytics() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState('day');
  const [tabValue, setTabValue] = useState(0);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => getAnalyticsSummary().then((res: any) => res.data),
  });

  const { data: productPerformance, isLoading: productLoading } = useQuery({
    queryKey: ['product-performance', selectedCategory],
    queryFn: () => getProductPerformance(selectedCategory).then((res: any) => res.data),
  });

  const { data: storePerformance, isLoading: storeLoading } = useQuery({
    queryKey: ['store-performance', selectedRegion],
    queryFn: () => getStorePerformance(selectedRegion).then((res: any) => res.data),
  });

  const { data: regionalTrends, isLoading: trendsLoading } = useQuery<RegionalTrend[]>({
    queryKey: ['regional-trends'],
    queryFn: () => getRegionalTrends().then((res: any) => res.data),
  });

  const { data: trendAnalysis, isLoading: trendLoading } = useQuery<TrendAnalysisData>({
    queryKey: ['trend-analysis', selectedTimeRange],
    queryFn: () => getTrendAnalysis(selectedTimeRange).then((res: any) => res.data),
  });

  const { data: dailySummary, isLoading: dailyLoading } = useQuery<DailySummaryPoint[]>({
    queryKey: ['daily-summary'],
    queryFn: () => getDailySummary().then((res: any) => res.data),
  });

  if (summaryLoading || productLoading || storeLoading || trendsLoading || trendLoading || dailyLoading) {
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
    { title: 'Inventory Health Score', value: `${(summary?.inventory_health_score ?? 0).toFixed(1)}%` },
  ];

  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Analytics Dashboard
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        {summaryCards.map((card) => (
          <Grid item xs={12} sm={6} md={2.4} key={card.title}>
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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Overview" />
          <Tab label="Time-based Analysis" />
          <Tab label="Recommendations" />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Existing charts */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Product Performance
                  </Typography>
                  <FormControl size="small" sx={{ width: 200 }}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={selectedCategory}
                      label="Category"
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      <MenuItem value="laptops">Laptops</MenuItem>
                      <MenuItem value="phones">Phones</MenuItem>
                      <MenuItem value="tablets">Tablets</MenuItem>
                      <MenuItem value="accessories">Accessories</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total_quantity" name="Total Quantity" fill="#8884d8" />
                      <Bar dataKey="low_stock_count" name="Low Stock" fill="#ff4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Store Performance
                  </Typography>
                  <FormControl size="small" sx={{ width: 200 }}>
                    <InputLabel>Region</InputLabel>
                    <Select
                      value={selectedRegion}
                      label="Region"
                      onChange={(e) => setSelectedRegion(e.target.value)}
                    >
                      <MenuItem value="">All Regions</MenuItem>
                      {regionalTrends?.map((trend: RegionalTrend) => (
                        <MenuItem key={trend.region} value={trend.region}>
                          {trend.region}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={storePerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="store_name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total_products" name="Total Products" fill="#00C49F" />
                      <Bar dataKey="low_stock_items" name="Low Stock Items" fill="#ff4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Regional Distribution
                </Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={regionalTrends}
                        dataKey="total_quantity"
                        nameKey="region"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {regionalTrends?.map((entry: RegionalTrend, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Inventory Health by Region
                </Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={regionalTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="region" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="low_stock_percentage"
                        name="Low Stock %"
                        stroke="#ff4444"
                      />
                      <Line
                        type="monotone"
                        dataKey="avg_products_per_store"
                        name="Avg Products/Store"
                        stroke="#00C49F"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Time-based Analysis Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box mb={3}>
              <FormControl size="small">
                <InputLabel>Time Range</InputLabel>
                <Select
                  value={selectedTimeRange}
                  label="Time Range"
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                >
                  <MenuItem value="day">Daily</MenuItem>
                  <MenuItem value="week">Weekly</MenuItem>
                  <MenuItem value="month">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Inventory Trends Over Time
                </Typography>
                <Box height={400}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailySummary}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatDate}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={formatDate}
                        formatter={(value: number) => [value, 'Items']}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="quantity"
                        name="Total Quantity"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="low_stock_count"
                        name="Low Stock Items"
                        stroke="#ff4444"
                        fill="#ff4444"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="restock_count"
                        name="Restock Events"
                        stroke="#00C49F"
                        fill="#00C49F"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Growth Metrics
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Overall Growth Rate"
                      secondary={`${trendAnalysis?.overall_growth_rate.toFixed(1)}%`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Peak Inventory Period"
                      secondary={formatDate(trendAnalysis?.peak_period)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Lowest Inventory Period"
                      secondary={formatDate(trendAnalysis?.low_period)}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Category Growth Rates
                </Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendAnalysis?.categories}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="growth_rate" name="Growth Rate %" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Recommendations Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Recommendations
                </Typography>
                {trendAnalysis?.recommendations.map((recommendation: string, index: number) => (
                  <Alert
                    key={index}
                    severity={recommendation.includes('Increase') ? 'warning' : 'info'}
                    sx={{ mb: 2 }}
                  >
                    {recommendation}
                  </Alert>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
} 