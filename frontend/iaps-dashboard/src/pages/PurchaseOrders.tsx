import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  calculateReorder,
  getStores,
  getProducts,
} from '../services/api';

interface PurchaseOrderItem {
  product_id: number;
  quantity: number;
  product_name?: string;
  product_sku?: string;
}

interface PurchaseOrder {
  id: number;
  store_id: number;
  store_name: string;
  status: string;
  created_at: string;
  items: PurchaseOrderItem[];
  total_items: number;
}

interface ReorderSuggestion {
  product_id: number;
  product_name: string;
  product_sku: string;
  store_id: number;
  store_name: string;
  current_quantity: number;
  suggested_order: number;
  days_of_sales: number;
  total_sales: number;
  average_daily_sales: number;
}

export default function PurchaseOrders() {
  const queryClient = useQueryClient();
  const [selectedStore, setSelectedStore] = useState<number | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [daysOfSales, setDaysOfSales] = useState(30);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [selectedItems, setSelectedItems] = useState<PurchaseOrderItem[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Queries
  const { data: purchaseOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['purchase-orders', selectedStore, selectedStatus],
    queryFn: () => getPurchaseOrders({
      store_id: selectedStore || undefined,
      status: selectedStatus || undefined,
    }).then(res => res.data),
  });

  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: () => getStores().then(res => res.data),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts().then(res => res.data),
  });

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setCreateDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Purchase order created successfully',
        severity: 'success',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updatePurchaseOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setSnackbar({
        open: true,
        message: 'Status updated successfully',
        severity: 'success',
      });
    },
  });

  const calculateReorderMutation = useMutation({
    mutationFn: calculateReorder,
    onSuccess: (data) => {
      setReorderSuggestions(data.data);
    },
  });

  // Handlers
  const handleCreateOrder = () => {
    if (!selectedStore) return;
    createOrderMutation.mutate({
      store_id: selectedStore as number,
      items: selectedItems,
    });
  };

  const handleStatusChange = (orderId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: orderId, status: newStatus });
  };

  const handleCalculateReorder = () => {
    calculateReorderMutation.mutate({
      days_of_sales: daysOfSales,
      store_id: selectedStore || undefined,
    });
  };

  const handleCreateFromSuggestions = () => {
    if (!selectedStore) return;
    const items = reorderSuggestions
      .filter(suggestion => suggestion.store_id === selectedStore)
      .map(suggestion => ({
        product_id: suggestion.product_id,
        quantity: suggestion.suggested_order,
      }));
    createOrderMutation.mutate({
      store_id: selectedStore as number,
      items,
    });
    setReorderDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'submitted': return 'primary';
      case 'approved': return 'info';
      case 'received': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  if (ordersLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Purchase Orders
      </Typography>

      {/* Filters and Actions */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Store</InputLabel>
            <Select
              value={selectedStore}
              label="Store"
              onChange={(e) => setSelectedStore(e.target.value as number)}
            >
              <MenuItem value="">All Stores</MenuItem>
              {stores?.map((store: any) => (
                <MenuItem key={store.id} value={store.id}>
                  {store.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedStatus}
              label="Status"
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="submitted">Submitted</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="received">Received</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box display="flex" gap={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              startIcon={<CalculateIcon />}
              onClick={() => setReorderDialogOpen(true)}
            >
              Calculate Reorder
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Order
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Purchase Orders Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Store</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchaseOrders?.map((order: PurchaseOrder) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.store_name}</TableCell>
                <TableCell>
                  <Chip
                    label={order.status}
                    color={getStatusColor(order.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{order.total_items}</TableCell>
                <TableCell>
                  {new Date(order.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      size="small"
                    >
                      <MenuItem value="draft">Draft</MenuItem>
                      <MenuItem value="submitted">Submit</MenuItem>
                      <MenuItem value="approved">Approve</MenuItem>
                      <MenuItem value="received">Receive</MenuItem>
                      <MenuItem value="cancelled">Cancel</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Order Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Purchase Order</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Store</InputLabel>
              <Select
                value={selectedStore}
                label="Store"
                onChange={(e) => setSelectedStore(e.target.value as number)}
              >
                {stores?.map((store: any) => (
                  <MenuItem key={store.id} value={store.id}>
                    {store.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="h6" gutterBottom>
              Items
            </Typography>
            {selectedItems.map((item, index) => (
              <Box key={index} display="flex" gap={2} mb={2}>
                <FormControl sx={{ flex: 2 }}>
                  <InputLabel>Product</InputLabel>
                  <Select
                    value={item.product_id}
                    label="Product"
                    onChange={(e) => {
                      const newItems = [...selectedItems];
                      newItems[index].product_id = e.target.value as number;
                      setSelectedItems(newItems);
                    }}
                  >
                    {products?.map((product: any) => (
                      <MenuItem key={product.id} value={product.id}>
                        {product.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Quantity"
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const newItems = [...selectedItems];
                    newItems[index].quantity = parseInt(e.target.value);
                    setSelectedItems(newItems);
                  }}
                  sx={{ flex: 1 }}
                />
                <IconButton
                  color="error"
                  onClick={() => {
                    const newItems = selectedItems.filter((_, i) => i !== index);
                    setSelectedItems(newItems);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={() => setSelectedItems([...selectedItems, { product_id: 0, quantity: 1 }])}
            >
              Add Item
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateOrder}
            disabled={!selectedStore || selectedItems.length === 0}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reorder Calculator Dialog */}
      <Dialog open={reorderDialogOpen} onClose={() => setReorderDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Calculate Reorder Quantities</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Store</InputLabel>
                  <Select
                    value={selectedStore}
                    label="Store"
                    onChange={(e) => setSelectedStore(e.target.value as number)}
                  >
                    <MenuItem value="">All Stores</MenuItem>
                    {stores?.map((store: any) => (
                      <MenuItem key={store.id} value={store.id}>
                        {store.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Days of Sales History"
                  type="number"
                  value={daysOfSales}
                  onChange={(e) => setDaysOfSales(parseInt(e.target.value))}
                />
              </Grid>
            </Grid>

            <Button
              variant="contained"
              onClick={handleCalculateReorder}
              sx={{ mb: 3 }}
            >
              Calculate
            </Button>

            {reorderSuggestions.length > 0 && (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Store</TableCell>
                      <TableCell align="right">Current Stock</TableCell>
                      <TableCell align="right">Total Sales</TableCell>
                      <TableCell align="right">Suggested Order</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reorderSuggestions.map((suggestion) => (
                      <TableRow key={`${suggestion.product_id}-${suggestion.store_id}`}>
                        <TableCell>{suggestion.product_name}</TableCell>
                        <TableCell>{suggestion.store_name}</TableCell>
                        <TableCell align="right">{suggestion.current_quantity}</TableCell>
                        <TableCell align="right">{suggestion.total_sales}</TableCell>
                        <TableCell align="right">{suggestion.suggested_order}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReorderDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateFromSuggestions}
            disabled={reorderSuggestions.length === 0 || !selectedStore}
          >
            Create Order from Suggestions
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity as any}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 