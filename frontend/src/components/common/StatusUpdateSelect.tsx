import React, { useState, useEffect } from 'react'; // <<<--- THE FIX IS HERE
import { Select, MenuItem, CircularProgress, Box, SelectChangeEvent } from '@mui/material';
import { useMutation, useQueryClient } from 'react-query';
import { shipmentAPI } from '../../services/api';
import { toast } from 'react-toastify';

interface StatusUpdateSelectProps {
  shipmentId: string;
  currentStatus: string;
  statusOptions: readonly string[];
  queryToInvalidate: string;
}

const StatusUpdateSelect: React.FC<StatusUpdateSelectProps> = ({ 
  shipmentId, 
  currentStatus, 
  statusOptions,
  queryToInvalidate,
}) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(currentStatus);

  const updateStatusMutation = useMutation(
    (newStatus: string) => shipmentAPI.update(shipmentId, { status: newStatus }),
    {
      onSuccess: (data) => {
        const newStatusLabel = data.data.data.status.replace(/_/g, ' ');
        toast.success(`Status updated to ${newStatusLabel}`);
        queryClient.invalidateQueries(queryToInvalidate);
        // Update local state from the definitive server response
        setStatus(data.data.data.status);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || "Failed to update status.");
        // Revert to the original status on error
        setStatus(currentStatus);
      },
    }
  );

  const handleChange = (event: SelectChangeEvent<string>) => {
    const newStatus = event.target.value;
    updateStatusMutation.mutate(newStatus);
  };
  
  // Keep local state in sync if the parent data changes
  useEffect(() => {
      setStatus(currentStatus);
  }, [currentStatus]);

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <Select
        value={status}
        onChange={handleChange}
        size="small"
        variant="outlined"
        disabled={updateStatusMutation.isLoading}
        sx={{ 
            minWidth: 140, 
            textTransform: 'capitalize',
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            '& .MuiSelect-select': {
                py: 0.5,
                px: 1,
            }
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {statusOptions.map(option => (
          <MenuItem key={option} value={option} sx={{ textTransform: 'capitalize' }}>
            {option.replace(/_/g, ' ')}
          </MenuItem>
        ))}
      </Select>
      {updateStatusMutation.isLoading && (
        <CircularProgress
          size={20}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginTop: '-10px',
            marginLeft: '-10px',
          }}
        />
      )}
    </Box>
  );
};

export default StatusUpdateSelect;