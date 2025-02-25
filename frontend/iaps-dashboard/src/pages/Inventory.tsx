import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Switch,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import {
  getInventory,
  createInventory,
  updateInventory,
  deleteInventory,
  restockInventory,
  getProducts,
  getStores,
  calculateReorder,
} from '../services/api';
import SearchBar from '../components/SearchBar';

interface InventoryFormData {
  product_id: number;
  store_id: number;
  quantity: number;
  reorder_point: number;
  reorder_quantity: number;
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

const initialFormData: InventoryFormData = {
  product_id: 0,
  store_id: 0,
  quantity: 0,
  reorder_point: 10,
  reorder_quantity: 25,
};

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingInventory, setEditingInventory] = useState<number | null>(null);
  const [formData, setFormData] = useState<InventoryFormData>(initialFormData);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [showLowStock, setShowLowStock] = useState(false);
  const [restockAmount, setRestockAmount] = useState<number>(0);
  const [restockingId, setRestockingId] = useState<number | null>(null);
  const [useSalesHistory, setUseSalesHistory] = useState(false);
  const [daysOfSales, setDaysOfSales] = useState(30);
  const [reorderSuggestions, setReorderSuggestions] = useState<Record<number, ReorderSuggestion>>({});

  const queryClient = useQueryClient();

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', search, selectedStore, showLowStock],
    queryFn: () => getInventory({
      store_id: selectedStore || undefined,
      low_stock: showLowStock,
      search,
    }).then(res => res.data),
  });

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => getProducts().then(res => res.data),
  });

  const { data: stores } = useQuery({
    queryKey: ['stores-list'],
    queryFn: () => getStores().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: createInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateInventory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const restockMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      restockInventory(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setRestockingId(null);
      setRestockAmount(0);
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

  const handleOpenDialog = (inventoryItem?: any) => {
    if (inventoryItem) {
      setEditingInventory(inventoryItem.id);
      setFormData({
        product_id: inventoryItem.product_id,
        store_id: inventoryItem.store_id,
        quantity: inventoryItem.quantity,
        reorder_point: inventoryItem.reorder_point || 10,
        reorder_quantity: inventoryItem.reorder_quantity || 25,
      });
    } else {
      setEditingInventory(null);
      setFormData(initialFormData);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingInventory(null);
    setFormData(initialFormData);
  };

  const handleSubmit = () => {
    if (editingInventory) {
      updateMutation.mutate({ id: editingInventory, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this inventory record?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleRestock = (id: number) => {
    if (restockAmount > 0) {
      restockMutation.mutate({ id, quantity: restockAmount });
    }
  };

  React.useEffect(() => {
    if (useSalesHistory) {
      calculateReorderMutation.mutate({
        days_of_sales: daysOfSales,
        store_id: selectedStore || undefined,
      });
    }
  }, [useSalesHistory, daysOfSales, selectedStore]);

  const getStockLevel = (item: any) => {
    if (!useSalesHistory) {
      if (item.quantity <= item.reorder_point) return 'error';
      if (item.quantity <= item.reorder_point * 1.5) return 'warning';
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
      return item.quantity <= item.reorder_point ? "Low Stock" : "In Stock";
    } else {
      const suggestion = reorderSuggestions[item.product_id];
      if (!suggestion) return "In Stock";
      return item.quantity <= suggestion.total_sales ? "Low Stock" : "In Stock";
    }
  };

  const reorderMethodSection = (
    <Grid container spacing={2} mb={3}>
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
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Inventory</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Inventory
        </Button>
      </Box>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <SearchBar
            placeholder="Search inventory..."
            value={search}
            onChange={setSearch}
            onSearch={() => queryClient.invalidateQueries({ queryKey: ['inventory'] })}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Store</InputLabel>
            <Select
              value={selectedStore || ''}
              label="Store"
              onChange={(e) => setSelectedStore(e.target.value ? Number(e.target.value) : null)}
            >
              <MenuItem value="">All Stores</MenuItem>
              {stores?.map((store: any) => (
                <MenuItem key={store.id} value={store.id}>{store.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <Button
            fullWidth
            variant={showLowStock ? "contained" : "outlined"}
            color="warning"
            onClick={() => setShowLowStock(!showLowStock)}
          >
            Show Low Stock Only
          </Button>
        </Grid>
      </Grid>

      {reorderMethodSection}

      <Grid container spacing={3}>
        {inventory?.map((item: any) => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6" gutterBottom>
                    {item.product_name}
                  </Typography>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(item)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(item.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  Store: {item.store_name}
                </Typography>
                <Box mt={2}>
                  <Typography variant="body2">
                    Quantity: {item.quantity}
                    <Chip
                      size="small"
                      color={getStockLevel(item)}
                      label={getStockStatus(item)}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={useSalesHistory 
                      ? (item.quantity / (reorderSuggestions[item.product_id]?.total_sales || item.quantity) * 100)
                      : (item.quantity / (item.reorder_point * 2)) * 100}
                    color={getStockLevel(item)}
                    sx={{ mt: 1, mb: 2 }}
                  />
                  {!useSalesHistory ? (
                    <>
                      <Typography variant="body2" color="textSecondary">
                        Reorder Point: {item.reorder_point}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Reorder Quantity: {item.reorder_quantity}
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
                      <Box mt={1}>
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
                      </Box>
                    </>
                  )}
                  {restockingId === item.id ? (
                    <Box mt={2}>
                      <TextField
                        size="small"
                        type="number"
                        label="Restock Amount"
                        value={restockAmount}
                        onChange={(e) => setRestockAmount(Number(e.target.value))}
                        sx={{ mr: 1 }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleRestock(item.id)}
                      >
                        Confirm
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      startIcon={<RefreshIcon />}
                      size="small"
                      onClick={() => setRestockingId(item.id)}
                      sx={{ mt: 1 }}
                    >
                      Restock
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingInventory ? 'Edit Inventory' : 'Add New Inventory'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Product</InputLabel>
              <Select
                value={formData.product_id}
                label="Product"
                onChange={(e) => setFormData({ ...formData, product_id: Number(e.target.value) })}
              >
                {products?.map((product: any) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Store</InputLabel>
              <Select
                value={formData.store_id}
                label="Store"
                onChange={(e) => setFormData({ ...formData, store_id: Number(e.target.value) })}
              >
                {stores?.map((store: any) => (
                  <MenuItem key={store.id} value={store.id}>
                    {store.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="Quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              margin="normal"
            />
            <TextField
              fullWidth
              type="number"
              label="Reorder Point"
              value={formData.reorder_point}
              onChange={(e) => setFormData({ ...formData, reorder_point: Number(e.target.value) })}
              margin="normal"
            />
            <TextField
              fullWidth
              type="number"
              label="Reorder Quantity"
              value={formData.reorder_quantity}
              onChange={(e) => setFormData({ ...formData, reorder_quantity: Number(e.target.value) })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingInventory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 