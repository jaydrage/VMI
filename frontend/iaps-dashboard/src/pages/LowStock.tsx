import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Button,
  TextField,
  Chip,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Tooltip,
  Divider,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { getInventory, restockInventory, getStores, calculateReorder } from '../services/api';
import SearchBar from '../components/SearchBar';

interface RestockItem {
  id: number;
  quantity: number;
}

interface ReorderSuggestion {
  product_id: number;
  product_name: string;
  store_id: number;
  store_name: string;
  current_quantity: number;
  suggested_order: number;
  days_of_sales: number;
  total_sales: number;
  average_daily_sales: number;
}

export default function LowStock() {
  const [search, setSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [restockItems, setRestockItems] = useState<Record<number, number>>({});
  const [useSalesHistory, setUseSalesHistory] = useState(false);
  const [daysOfSales, setDaysOfSales] = useState(30);
  const [reorderSuggestions, setReorderSuggestions] = useState<Record<number, ReorderSuggestion>>({});

  const queryClient = useQueryClient();

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['low-stock-inventory', search, selectedStore],
    queryFn: () => getInventory({
      store_id: selectedStore || undefined,
      low_stock: true,
      search,
    }).then(res => res.data),
  });

  const { data: stores } = useQuery({
    queryKey: ['stores-list'],
    queryFn: () => getStores().then(res => res.data),
  });

  const restockMutation = useMutation({
    mutationFn: ({ id, quantity }: RestockItem) => restockInventory(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-inventory'] });
      setRestockItems({});
    },
  });

  const calculateReorderMutation = useMutation({
    mutationFn: calculateReorder,
    onSuccess: (data) => {
      const suggestions = data.data.reduce((acc: Record<number, ReorderSuggestion>, item: ReorderSuggestion) => {
        acc[item.product_id] = item;
        return acc;
      }, {});
      setReorderSuggestions(suggestions);
    },
  });

  React.useEffect(() => {
    if (useSalesHistory) {
      calculateReorderMutation.mutate({
        days_of_sales: daysOfSales,
        store_id: selectedStore || undefined,
      });
    }
  }, [useSalesHistory, daysOfSales, selectedStore]);

  const handleRestock = (id: number) => {
    const quantity = restockItems[id];
    if (quantity > 0) {
      restockMutation.mutate({ id, quantity });
    }
  };

  const getStockLevel = (item: any) => {
    if (!useSalesHistory) {
      if (item.quantity <= item.reorder_point * 0.5) return 'error';
      if (item.quantity <= item.reorder_point) return 'warning';
      return 'success';
    } else {
      const suggestion = reorderSuggestions[item.product_id];
      if (!suggestion) return 'success';
      if (item.quantity <= suggestion.total_sales * 0.5) return 'error';
      if (item.quantity <= suggestion.total_sales) return 'warning';
      return 'success';
    }
  };

  const getStockStatus = (item: any) => {
    if (!useSalesHistory) {
      return item.quantity <= item.reorder_point * 0.5 ? "Critical" : "Low Stock";
    } else {
      const suggestion = reorderSuggestions[item.product_id];
      if (!suggestion) return "In Stock";
      return item.quantity <= suggestion.total_sales * 0.5 ? "Critical" : "Low Stock";
    }
  };

  if (inventoryLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Low Stock Items
      </Typography>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <SearchBar
            placeholder="Search low stock items..."
            value={search}
            onChange={setSearch}
            onSearch={() => queryClient.invalidateQueries({ queryKey: ['low-stock-inventory'] })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Filter by Store</InputLabel>
            <Select
              value={selectedStore || ''}
              label="Filter by Store"
              onChange={(e) => setSelectedStore(e.target.value ? Number(e.target.value) : null)}
            >
              <MenuItem value="">All Stores</MenuItem>
              {stores?.map((store: any) => (
                <MenuItem key={store.id} value={store.id}>{store.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={useSalesHistory}
                  onChange={(e) => setUseSalesHistory(e.target.checked)}
                />
              }
              label="Use Sales History for Stock Levels"
            />
          </Grid>
          {useSalesHistory && (
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Days of Sales History"
                type="number"
                value={daysOfSales}
                onChange={(e) => setDaysOfSales(parseInt(e.target.value))}
                size="small"
              />
            </Grid>
          )}
        </Grid>
      </Box>

      <Grid container spacing={3}>
        {inventory?.map((item: any) => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {item.product_name}
                    </Typography>
                    <Typography color="textSecondary" gutterBottom>
                      Store: {item.store_name}
                    </Typography>
                  </Box>
                  <Chip
                    label={getStockStatus(item)}
                    color={getStockLevel(item)}
                    size="small"
                  />
                </Box>

                <Box mt={2}>
                  <Typography variant="body2" gutterBottom>
                    Current Quantity: {item.quantity}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={useSalesHistory
                      ? (item.quantity / (reorderSuggestions[item.product_id]?.total_sales || item.quantity) * 100)
                      : (item.quantity / item.reorder_point * 100)}
                    color={getStockLevel(item)}
                    sx={{ my: 1 }}
                  />

                  {!useSalesHistory ? (
                    <>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Reorder Point: {item.reorder_point}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Suggested Restock: {item.reorder_quantity}
                      </Typography>
                    </>
                  ) : reorderSuggestions[item.product_id] && (
                    <>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        {daysOfSales} Day Sales: {reorderSuggestions[item.product_id].total_sales}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Daily Average: {reorderSuggestions[item.product_id].average_daily_sales.toFixed(2)}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Tooltip title="Based on sales history">
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          Projected {daysOfSales} Day Need: {Math.ceil(reorderSuggestions[item.product_id].average_daily_sales * daysOfSales)}
                        </Typography>
                      </Tooltip>
                      <Tooltip title="Suggested order to maintain stock">
                        <Typography variant="body2" color={item.quantity < reorderSuggestions[item.product_id].suggested_order ? "error" : "textSecondary"}>
                          Suggested Order: {reorderSuggestions[item.product_id].suggested_order}
                        </Typography>
                      </Tooltip>
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                        Stock Coverage: {item.quantity > 0 
                          ? `${(item.quantity / reorderSuggestions[item.product_id].average_daily_sales).toFixed(1)} days`
                          : "Out of stock"}
                      </Typography>
                    </>
                  )}

                  <Box mt={2} display="flex" alignItems="center" gap={1}>
                    <TextField
                      size="small"
                      type="number"
                      label="Restock Amount"
                      value={restockItems[item.id] || ''}
                      onChange={(e) => setRestockItems({
                        ...restockItems,
                        [item.id]: Number(e.target.value)
                      })}
                      sx={{ width: 120 }}
                    />
                    <Button
                      variant="contained"
                      startIcon={<RefreshIcon />}
                      onClick={() => handleRestock(item.id)}
                      disabled={!restockItems[item.id] || restockItems[item.id] <= 0}
                      size="small"
                    >
                      Restock
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {inventory?.length === 0 && (
          <Grid item xs={12}>
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary">
                No low stock items found
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
} 