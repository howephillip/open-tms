import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip,
  CircularProgress, Alert, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Checkbox, FormControlLabel, MenuItem
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, DeleteOutline as DeleteIcon, Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { equipmentTypeAPI } from '../../../services/api';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';

interface IEquipmentTypeFE {
  _id?: string;
  name: string;
  code?: string;
  description?: string;
  category?: 'trailer' | 'container' | 'chassis' | 'other' | '';
  isActive: boolean;
}

const initialFormState: IEquipmentTypeFE = { name: '', code: '', description: '', category: '', isActive: true };
const equipmentCategories = ['trailer', 'container', 'chassis', 'other'];

const EquipmentTypesSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IEquipmentTypeFE | null>(null);
  const [formData, setFormData] = useState<IEquipmentTypeFE>(initialFormState);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<IEquipmentTypeFE | null>(null);

  const { data: response, isLoading, isError, error } = useQuery('equipmentTypesForManagement', () => equipmentTypeAPI.getAll({ limit: 100, sort: 'category name' }));
  const equipmentTypes: IEquipmentTypeFE[] = response?.data?.data || [];

  useEffect(() => {
    setFormData(editingItem ? { ...initialFormState, ...editingItem } : initialFormState);
  }, [editingItem]);

  const mutation = useMutation(
    (itemData: { id?: string; data: Partial<IEquipmentTypeFE> }) => itemData.id ? equipmentTypeAPI.update(itemData.id, itemData.data) : equipmentTypeAPI.create(itemData.data),
    {
      onSuccess: (_, variables) => {
        toast.success(`Equipment type ${variables.id ? 'updated' : 'created'} successfully!`);
        queryClient.invalidateQueries('equipmentTypesForManagement');
        queryClient.invalidateQueries('equipmentTypesLookup');
        setIsFormOpen(false);
      },
      onError: (err: any) => { toast.error(err.response?.data?.message || 'Failed to save equipment type.'); },
    }
  );

  const deleteMutationHook = useMutation(
    (id: string) => equipmentTypeAPI.delete(id),
    {
      onSuccess: () => {
        toast.success('Equipment type deleted successfully!');
        queryClient.invalidateQueries('equipmentTypesForManagement');
        queryClient.invalidateQueries('equipmentTypesLookup');
        setIsConfirmDeleteDialogOpen(false);
      },
      onError: (err: any) => { toast.error(err.response?.data?.message || 'Failed to delete equipment type.'); }
    }
  );

  const handleOpenForm = (item?: IEquipmentTypeFE) => { setEditingItem(item || null); setIsFormOpen(true); };
  const handleCloseForm = () => { setIsFormOpen(false); setEditingItem(null); };
  const handleSubmit = () => { if (!formData.name) { toast.error('Name is required.'); return; } mutation.mutate({ id: editingItem?._id, data: formData }); };
  const handleDeleteClick = (item: IEquipmentTypeFE) => { setItemToDelete(item); setIsConfirmDeleteDialogOpen(true); };
  const handleConfirmDelete = () => { if (itemToDelete?._id) deleteMutationHook.mutate(itemToDelete._id); };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Manage Equipment Types</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenForm()}>Add Equipment Type</Button>
      </Box>

      {isLoading && <CircularProgress />}
      {isError && <Alert severity="error">Error fetching data: {(error as any)?.message}</Alert>}
      {!isLoading && !isError && (
        <Paper elevation={2}>
          <TableContainer><Table size="small" stickyHeader>
            <TableHead><TableRow>
              <TableCell>Name</TableCell><TableCell>Code</TableCell><TableCell>Category</TableCell>
              <TableCell>Active</TableCell><TableCell align="right">Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {equipmentTypes.map((item) => (
                <TableRow hover key={item._id}>
                  <TableCell>{item.name}</TableCell><TableCell>{item.code || '-'}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{item.category}</TableCell>
                  <TableCell><Chip label={item.isActive ? 'Yes' : 'No'} color={item.isActive ? 'success' : 'default'} size="small" /></TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => handleOpenForm(item)}><EditIcon fontSize="inherit" /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" onClick={() => handleDeleteClick(item)} color="error"><DeleteIcon fontSize="inherit" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></TableContainer>
        </Paper>
      )}

      <Dialog open={isFormOpen} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Edit' : 'Add New'} Equipment Type</DialogTitle>
        <DialogContent><Grid container spacing={2} sx={{pt: 1}}>
          <Grid item xs={12} sm={8}><TextField fullWidth size="small" label="Name*" name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="Code" name="code" value={formData.code || ''} onChange={(e) => setFormData({...formData, code: e.target.value})} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="Description" name="description" value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} multiline rows={2} /></Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth size="small" label="Category" name="category" value={formData.category || ''} onChange={(e) => setFormData({...formData, category: e.target.value as any})}>
              <MenuItem value=""><em>None</em></MenuItem>
              {equipmentCategories.map(cat => <MenuItem key={cat} value={cat} sx={{textTransform: 'capitalize'}}>{cat}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}><FormControlLabel control={<Checkbox checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} />} label="Is Active?" /></Grid>
        </Grid></DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm} startIcon={<CloseIcon />}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" startIcon={<SaveIcon />} disabled={mutation.isLoading}>
            {mutation.isLoading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      {itemToDelete && <ConfirmationDialog open={isConfirmDeleteDialogOpen} onClose={() => setIsConfirmDeleteDialogOpen(false)} onConfirm={handleConfirmDelete}
          title="Delete Equipment Type?" contentText={`Are you sure you want to delete "${itemToDelete.name}"? Consider deactivating it instead.`} isLoading={deleteMutationHook.isLoading} />}
    </Box>
  );
};

export default EquipmentTypesSettings;