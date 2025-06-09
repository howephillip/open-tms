import React, { useState, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Link,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Grid
} from '@mui/material';
import { Delete as DeleteIcon, Visibility as ViewIcon, CloudUpload as UploadIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { documentAPI, shipmentAPI, carrierAPI, shipperAPI } from '../../services/api'; // Assuming these exist
import { toast } from 'react-toastify';

interface DocumentFile {
  _id: string;
  originalName: string;
  mimetype: string;
  size: number;
  s3Key: string; // Changed from path
  s3Location: string; // The full URL
  relatedTo?: {
    type: 'shipment' | 'carrier' | 'shipper' | 'general';
    id?: string;
    displayValue?: string;
  };
  uploadedBy?: { _id: string, email: string };
  tags?: string[];
  createdAt: string;
}

interface UploadFormData {
    relatedToType: 'shipment' | 'carrier' | 'shipper' | 'general';
    relatedToId: string;
    tags: string; // comma-separated
}

const initialUploadFormData: UploadFormData = {
    relatedToType: 'general',
    relatedToId: '',
    tags: ''
};

const Documents: React.FC = () => {
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [uploadMetadata, setUploadMetadata] = useState<UploadFormData>(initialUploadFormData);

  // Fetch documents
  const { data: documentsResponse, isLoading, isError, error } = useQuery(
    'documents',
    () => documentAPI.getAll({ limit: 50, sort: '-createdAt' }) // Sort by newest
  );
  const documents: DocumentFile[] = documentsResponse?.data?.documents || documentsResponse?.data?.data?.documents || [];

  // Fetch related entities for dropdown (simplified)
  const { data: shipmentsData } = useQuery('shipmentsForDocs', () => shipmentAPI.getAll({ limit: 100, fields: 'shipmentNumber' }), { enabled: uploadMetadata.relatedToType === 'shipment'});
  const { data: carriersData } = useQuery('carriersForDocs', () => carrierAPI.getAll({ limit: 100, fields: 'name' }), { enabled: uploadMetadata.relatedToType === 'carrier'});
  const { data: shippersData } = useQuery('shippersForDocs', () => shipperAPI.getAll({ limit: 100, fields: 'name' }), { enabled: uploadMetadata.relatedToType === 'shipper'});


  const uploadMutation = useMutation(
    (formDataInstance: FormData) => documentAPI.upload(formDataInstance),
    {
      onSuccess: (response) => {
        toast.success(response.data.message || `${response.data.data?.length || 1} document(s) uploaded successfully!`);
        queryClient.invalidateQueries('documents');
        setUploadDialogOpen(false);
        setFilesToUpload([]);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Error uploading document(s).');
      },
    }
  );

  const deleteMutation = useMutation(
    (docId: string) => documentAPI.delete(docId),
    {
        onSuccess: () => {
            toast.success("Document deleted successfully!");
            queryClient.invalidateQueries('documents');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Error deleting document.");
        }
    }
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
        setFilesToUpload(acceptedFiles);
        setUploadMetadata(initialUploadFormData); // Reset metadata form
        setUploadDialogOpen(true);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true });

  const handleUploadMetadataChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const name = e.target.name as keyof UploadFormData;
    const value = e.target.value as string;
    setUploadMetadata(prev => ({ ...prev, [name]: value, relatedToId: name === 'relatedToType' ? '' : prev.relatedToId })); // Reset ID if type changes
  };

  const handleConfirmUpload = () => {
    if (filesToUpload.length === 0) {
        toast.warn("No files selected for upload.");
        return;
    }
    if (uploadMetadata.relatedToType !== 'general' && !uploadMetadata.relatedToId) {
        toast.warn(`Please select a specific ${uploadMetadata.relatedToType} to link the document(s) to.`);
        return;
    }

    const formDataInstance = new FormData();
    filesToUpload.forEach(file => formDataInstance.append('files', file)); // Backend should handle 'files' array
    formDataInstance.append('relatedToType', uploadMetadata.relatedToType);
    if (uploadMetadata.relatedToId) {
        formDataInstance.append('relatedToId', uploadMetadata.relatedToId);
    }
    formDataInstance.append('tags', uploadMetadata.tags);

    uploadMutation.mutate(formDataInstance);
  };


  const handleDelete = (docId: string) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
        deleteMutation.mutate(docId);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getRelatedToDisplay = (doc: DocumentFile): string => {
    if (!doc.relatedTo) return "General";
    if (doc.relatedTo.displayValue) return doc.relatedTo.displayValue; // If backend provides it
    // Basic fallback if displayValue is not sent from backend (you might need to fetch this info)
    return `${doc.relatedTo.type.charAt(0).toUpperCase() + doc.relatedTo.type.slice(1)} (${doc.relatedTo.id?.slice(-6) || 'N/A'})`;
  }

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error">Error fetching documents: {(error as any)?.message}</Alert>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Documents</Typography>

      <Paper
        {...getRootProps()}
        sx={{ p: 3, mb: 3, border: `2px dashed ${isDragActive ? 'primary.main' : 'grey.500'}`, textAlign: 'center', cursor: 'pointer' }}
        onClick={() => (document.getElementById('file-upload-input-hidden') as HTMLElement)?.click()}
      >
        <input {...getInputProps()} id="file-upload-input-hidden" style={{ display: 'none' }} />
        <UploadIcon sx={{ fontSize: 40, color: 'grey.700', mb: 1 }} />
        <Typography>{isDragActive ? "Drop files here..." : "Drag 'n' drop files here, or click to select"}</Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead><TableRow>
            <TableCell>Name</TableCell><TableCell>Size</TableCell><TableCell>Type</TableCell>
            <TableCell>Related To</TableCell><TableCell>Uploaded</TableCell><TableCell>Tags</TableCell><TableCell>Actions</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc._id}>
                <TableCell><Link href={`/api/documents/download/${doc._id}`} target="_blank" rel="noopener noreferrer">{doc.originalName}</Link></TableCell> {/* Assuming a download endpoint */}
                <TableCell>{formatFileSize(doc.size)}</TableCell>
                <TableCell>{doc.mimetype}</TableCell>
                <TableCell>{getRelatedToDisplay(doc)}</TableCell>
                <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{doc.tags?.map(tag => <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5 }} />)}</TableCell>
                <TableCell>
                  <IconButton size="small" title="View/Download" component="a" href={`/api/documents/download/${doc._id}`} target="_blank"><ViewIcon /></IconButton>
                  <IconButton size="small" title="Delete" onClick={() => handleDelete(doc._id)} disabled={deleteMutation.isLoading && deleteMutation.variables === doc._id}>
                    {deleteMutation.isLoading && deleteMutation.variables === doc._id ? <CircularProgress size={20}/> : <DeleteIcon />}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document(s) - {filesToUpload.length} file(s)</DialogTitle>
        <DialogContent>
            <Box sx={{mb:2}}>
                {filesToUpload.map(f => <Typography key={f.name} variant="body2">- {f.name} ({formatFileSize(f.size)})</Typography>)}
            </Box>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField select fullWidth label="Relate To Type" name="relatedToType" value={uploadMetadata.relatedToType} onChange={handleUploadMetadataChange}>
                        <MenuItem value="general">General</MenuItem>
                        <MenuItem value="shipment">Shipment</MenuItem>
                        <MenuItem value="carrier">Carrier</MenuItem>
                        <MenuItem value="shipper">Shipper</MenuItem>
                    </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                    {uploadMetadata.relatedToType === 'shipment' && (
                        <TextField select fullWidth label="Select Shipment" name="relatedToId" value={uploadMetadata.relatedToId} onChange={handleUploadMetadataChange} disabled={!shipmentsData}>
                            {(shipmentsData?.data?.shipments || []).map((s: any) => <MenuItem key={s._id} value={s._id}>{s.shipmentNumber}</MenuItem>)}
                        </TextField>
                    )}
                    {uploadMetadata.relatedToType === 'carrier' && (
                         <TextField select fullWidth label="Select Carrier" name="relatedToId" value={uploadMetadata.relatedToId} onChange={handleUploadMetadataChange} disabled={!carriersData}>
                            {(carriersData?.data?.carriers || []).map((c: any) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
                        </TextField>
                    )}
                     {uploadMetadata.relatedToType === 'shipper' && (
                         <TextField select fullWidth label="Select Shipper" name="relatedToId" value={uploadMetadata.relatedToId} onChange={handleUploadMetadataChange} disabled={!shippersData}>
                            {(shippersData?.data?.shippers || []).map((s: any) => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
                        </TextField>
                    )}
                </Grid>
                <Grid item xs={12}>
                    <TextField fullWidth label="Tags (comma-separated)" name="tags" value={uploadMetadata.tags} onChange={handleUploadMetadataChange} />
                </Grid>
            </Grid>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmUpload} variant="contained" disabled={uploadMutation.isLoading}>
                {uploadMutation.isLoading ? <CircularProgress size={24}/> : "Upload"}
            </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Documents;