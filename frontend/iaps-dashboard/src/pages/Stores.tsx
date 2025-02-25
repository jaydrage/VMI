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
  MenuItem,
  Select,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { getStores, createStore, updateStore, deleteStore, getStoreStats } from '../services/api';
import SearchBar from '../components/SearchBar';

interface StoreFormData {
  name: string;
  location: string;
  region: string;
}

const initialFormData: StoreFormData = {
  name: '',
  location: '',
  region: '',
};

const regions = ['North', 'South', 'East', 'West', 'Central'];

export default function Stores() {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingStore, setEditingStore] = useState<number | null>(null);
  const [formData, setFormData] = useState<StoreFormData>(initialFormData);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const { data: stores, isLoading } = useQuery({
    queryKey: ['stores', search, region],
    queryFn: () => getStores({ search, region }).then(res => res.data),
  });

  const { data: storeStats } = useQuery({
    queryKey: ['store-stats', selectedStore],
    queryFn: () => selectedStore ? getStoreStats(selectedStore).then(res => res.data) : null,
    enabled: !!selectedStore,
  });

  const createMutation = useMutation({
    mutationFn: createStore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateStore(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });

  const handleOpenDialog = (store?: any) => {
    if (store) {
      setEditingStore(store.id);
      setFormData({
        name: store.name,
        location: store.location,
        region: store.region || '',
      });
    } else {
      setEditingStore(null);
      setFormData(initialFormData);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingStore(null);
    setFormData(initialFormData);
  };

  const handleSubmit = () => {
    if (editingStore) {
      updateMutation.mutate({ id: editingStore, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this store?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Stores</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Store
        </Button>
      </Box>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={8}>
          <SearchBar
            placeholder="Search stores..."
            value={search}
            onChange={setSearch}
            onSearch={() => queryClient.invalidateQueries({ queryKey: ['stores'] })}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Region</InputLabel>
            <Select
              value={region}
              label="Region"
              onChange={(e) => setRegion(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {regions.map((reg) => (
                <MenuItem key={reg} value={reg}>{reg}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {stores?.map((store: any) => (
          <Grid item xs={12} sm={6} md={4} key={store.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6" gutterBottom>
                    {store.name}
                  </Typography>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => setSelectedStore(store.id)}
                    >
                      <InventoryIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(store)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(store.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  {store.location}
                </Typography>
                {store.region && (
                  <Chip
                    label={store.region}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                )}
                {selectedStore === store.id && storeStats && (
                  <Box mt={2}>
                    <Typography variant="body2" color="textSecondary">
                      Total Products: {storeStats.total_products}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Items: {storeStats.total_items}
                    </Typography>
                    <Typography variant="body2" color="error">
                      Low Stock Items: {storeStats.low_stock_items}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingStore ? 'Edit Store' : 'Add New Store'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Region</InputLabel>
              <Select
                value={formData.region}
                label="Region"
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {regions.map((reg) => (
                  <MenuItem key={reg} value={reg}>{reg}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingStore ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 