// File: frontend/src/pages/settings/components/AccessorialTypesSettings.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip,
  CircularProgress, Alert, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Checkbox, FormControlLabel, Autocomplete,
  InputAdornment,
  MenuItem,
  TablePagination
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, DeleteOutline as DeleteIcon,
  Save as SaveIcon, Close as CloseIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { accessorialTypeAPI } from '../../../services/api';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog'; // IMPORTED

const modeOfTransportOptionsList = [
  'truckload-ftl', 'truckload-ltl', 'drayage-import', 'drayage-export', 'intermodal-rail',
  'ocean-fcl', 'ocean-lcl', 'air-freight', 'expedited-ground', 'final-mile', 'other'
];
const accessorialCategories = ['Equipment', 'Handling', 'Wait Time', 'Fuel', 'Regulatory', 'Documentation', 'Other'];


export interface IAccessorialTypeFE {
  _id?: string;
  name: string;
  code?: string; // Made optional
  description?: string;
  defaultCustomerRate?: number;
  defaultCarrierCost?: number;
  appliesToModes: string[];
  category?: string;
  isPerUnit?: boolean;
  unitName?: string;
  isActive: boolean;
}

const initialFormState: IAccessorialTypeFE = {
  name: '',
  code: '', // Still can be empty string for controlled component
  description: '',
  defaultCustomerRate: 0,
  defaultCarrierCost: 0,
  appliesToModes: [],
  category: accessorialCategories[0],
  isPerUnit: false,
  unitName: '',
  isActive: true,
};

const AccessorialTypesSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IAccessorialTypeFE | null>(null);
  const [formData, setFormData] = useState<IAccessorialTypeFE>(initialFormState);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<IAccessorialTypeFE | null>(null);


  const { data: response, isLoading, isFetching, isError, error } = useQuery(
    ['accessorialTypesForManagement', page, rowsPerPage],
    async () => {
      const params = { page: (page + 1).toString(), limit: rowsPerPage.toString(), sort: 'category name' };
      const res = await accessorialTypeAPI.getAll(params);
      return res.data.data;
    },
    { keepPreviousData: true }
  );

  const accessorialTypes: IAccessorialTypeFE[] = response?.accessorialTypes || [];
  const pagination = response?.pagination;

  useEffect(() => {
    if (editingItem) {
      setFormData({ ...initialFormState, ...editingItem, code: editingItem.code || '' }); // Ensure code is string
    } else {
      setFormData(initialFormState);
    }
  }, [editingItem]);

  const mutation = useMutation(
    (itemData: { id?: string; data: Partial<IAccessorialTypeFE> }) => {
        const payload = {...itemData.data};
        if(payload.code === '') delete payload.code; // Don't send empty string code if it's optional
        return itemData.id
            ? accessorialTypeAPI.update(itemData.id, payload)
            : accessorialTypeAPI.create(payload)
    },
    {
      onSuccess: (res, variables) => {
        toast.success(`Accessorial type ${variables.id ? 'updated' : 'created'} successfully!`);
        queryClient.invalidateQueries('accessorialTypesForManagement');
        queryClient.invalidateQueries('accessorialTypesLookup');
        setIsFormOpen(false);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to save accessorial type.');
      },
    }
  );

  const deleteMutationHook = useMutation(
    (id: string) => accessorialTypeAPI.delete(id),
    {
        onSuccess: () => {
            toast.success('Accessorial type deleted successfully!');
            queryClient.invalidateQueries('accessorialTypesForManagement');
            queryClient.invalidateQueries('accessorialTypesLookup');
            setIsConfirmDeleteDialogOpen(false);
            setItemToDelete(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to delete accessorial type.');
            setIsConfirmDeleteDialogOpen(false);
            setItemToDelete(null);
        }
    }
  );

  const handleOpenForm = (item?: IAccessorialTypeFE) => {
    setEditingItem(item || null);
    if (item && item._id) {
        accessorialTypeAPI.getById(item._id).then(res => {
            if (res.data.success && res.data.data) {
                setFormData({...initialFormState, ...res.data.data, code: res.data.data.code || ''});
            } else {
                toast.error("Could not fetch details for editing.");
                setFormData(initialFormState);
            }
        }).catch(() => {
            toast.error("Error fetching details for editing.");
            setFormData(initialFormState);
        });
    } else {
        setFormData(initialFormState);
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    const checked = (event.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value),
    }));
  };

  const handleMultiSelectChange = (name: keyof IAccessorialTypeFE, newValue: string[]) => {
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };


  const handleSubmit = () => {
    // Code is no longer required in this check
    if (!formData.name || formData.appliesToModes.length === 0 || !formData.category) {
      toast.error('Name, Category, and at least one Applicable Mode are required.');
      return;
    }
    mutation.mutate({ id: editingItem?._id, data: formData });
  };

  const handleDeleteClick = (item: IAccessorialTypeFE) => {
    setItemToDelete(item);
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete?._id) {
        deleteMutationHook.mutate(itemToDelete._id);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };


  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Manage Accessorial Types</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenForm()}>
          Add Accessorial Type
        </Button>
      </Box>

      {(isLoading || isFetching) && !response && <Box sx={{display: 'flex', justifyContent: 'center', p:3}}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error fetching data: {(error as any)?.message}</Alert>}

      {!isLoading && !isError && (
        <Paper elevation={2}>
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  {/* <TableCell>Code</TableCell> // Removed Code from table display */}
                  <TableCell>Category</TableCell>
                  <TableCell>Default Rate/Cost</TableCell>
                  <TableCell>Modes</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accessorialTypes.map((item) => (
                  <TableRow hover key={item._id}>
                    <TableCell>{item.name}</TableCell>
                    {/* <TableCell>{item.code || '-'}</TableCell> // Display '-' if code is not present */}
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                        Cust: ${item.defaultCustomerRate?.toFixed(2) || '0.00'} / Carr: ${item.defaultCarrierCost?.toFixed(2) || '0.00'}
                        {item.isPerUnit && ` per ${item.unitName || 'unit'}`}
                    </TableCell>
                    <TableCell sx={{maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                        <Tooltip title={item.appliesToModes.join(', ')}>
                            <span>{item.appliesToModes.join(', ')}</span>
                        </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip label={item.isActive ? 'Yes' : 'No'} color={item.isActive ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => handleOpenForm(item)}><EditIcon fontSize="inherit" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" onClick={() => handleDeleteClick(item)} color="error" disabled={deleteMutationHook.isLoading && itemToDelete?._id === item._id}><DeleteIcon fontSize="inherit" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {accessorialTypes.length === 0 && !isLoading && (
                    <TableRow><TableCell colSpan={6} align="center">No accessorial types found. Click "Add Accessorial Type" to create one.</TableCell></TableRow> // Adjusted colSpan
                )}
              </TableBody>
            </Table>
          </TableContainer>
           {pagination && pagination.total > 0 && (
            <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={pagination.total || 0}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
           )}
        </Paper>
      )}

      <Dialog open={isFormOpen} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>{editingItem ? 'Edit' : 'Add New'} Accessorial Type</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{pt: 1}}>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Name*" name="name" value={formData.name} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Code (Optional)" name="code" value={formData.code || ''} onChange={handleInputChange} helperText="Optional short identifier"/></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Description" name="description" value={formData.description || ''} onChange={handleInputChange} multiline rows={2} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Default Customer Rate" name="defaultCustomerRate" type="number" value={formData.defaultCustomerRate || 0} onChange={handleInputChange} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Default Carrier Cost" name="defaultCarrierCost" type="number" value={formData.defaultCarrierCost || 0} onChange={handleInputChange} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} /></Grid>
            <Grid item xs={12}>
                <Autocomplete
                    multiple
                    size="small"
                    options={modeOfTransportOptionsList}
                    getOptionLabel={(option) => option.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    value={formData.appliesToModes}
                    onChange={(event, newValue) => handleMultiSelectChange('appliesToModes', newValue)}
                    renderInput={(params) => ( <TextField {...params} label="Applies to Modes*" variant="outlined" /> )}
                    renderTags={(value: readonly string[], getTagProps) => value.map((option: string, index: number) => ( <Chip variant="outlined" label={option.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} {...getTagProps({ index })} sx={{textTransform:'capitalize'}} size="small"/> )) }
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField select fullWidth size="small" label="Category*" name="category" value={formData.category || ''} onChange={(e) => setFormData(prev => ({...prev, category: e.target.value}))}>
                    <MenuItem value=""><em>Select Category</em></MenuItem>
                    {accessorialCategories.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                </TextField>
            </Grid>
            <Grid item xs={12} sm={6} container alignItems="center">
                <FormControlLabel control={<Checkbox checked={formData.isPerUnit || false} onChange={(e) => setFormData(prev => ({...prev, isPerUnit: e.target.checked, unitName: e.target.checked ? prev.unitName : ''}))} name="isPerUnit" />} label="Is Per Unit?" />
            </Grid>
            {formData.isPerUnit && (
                <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Unit Name (e.g., hour, day, mile)" name="unitName" value={formData.unitName || ''} onChange={handleInputChange} /></Grid>
            )}
             <Grid item xs={12} sm={formData.isPerUnit ? 6 : 12} container alignItems="center" >
                <FormControlLabel control={<Checkbox checked={formData.isActive} onChange={(e) => setFormData(prev => ({...prev, isActive: e.target.checked}))} name="isActive" />} label="Is Active?" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm} startIcon={<CloseIcon />}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" startIcon={<SaveIcon />} disabled={mutation.isLoading}>
            {mutation.isLoading ? <CircularProgress size={20} sx={{color: 'white'}} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {itemToDelete && (
        <ConfirmationDialog
            open={isConfirmDeleteDialogOpen}
            onClose={() => { setIsConfirmDeleteDialogOpen(false); setItemToDelete(null);}}
            onConfirm={handleConfirmDelete}
            title="Delete Accessorial Type?"
            contentText={`Are you sure you want to delete "${itemToDelete.name}"? This may affect existing shipments if not handled carefully. Consider deactivating instead.`}
            isLoading={deleteMutationHook.isLoading}
        />
      )}
    </Box>
  );
};

export default AccessorialTypesSettings;