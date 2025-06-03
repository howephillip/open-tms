// File: frontend/src/pages/shipments/components/EmailGenDialog.tsx
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Paper
} from '@mui/material';

interface EmailGenDialogProps {
  open: boolean;
  onClose: () => void;
  emailContent: string;
  shipmentNumber?: string;
  recipientInfo?: string; // e.g., "Shipper Contact: name@example.com"
}

const EmailGenDialog: React.FC<EmailGenDialogProps> = ({
  open, onClose, emailContent, shipmentNumber, recipientInfo
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Generated Email for {shipmentNumber || ''}</DialogTitle>
      <DialogContent>
        {recipientInfo && <Typography variant="body2" gutterBottom><strong>To:</strong> {recipientInfo}</Typography>}
        <Typography variant="body2" gutterBottom><strong>Subject:</strong> Status Update: Shipment {shipmentNumber || ''}</Typography>
        <Paper variant="outlined" sx={{p:2, mt:1, whiteSpace: 'pre-wrap', maxHeight: '60vh', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.4' }}>
          {emailContent || "No content generated or an error occurred."}
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {/* TODO: Add "Copy to Clipboard" functionality */}
      </DialogActions>
    </Dialog>
  );
};

export default EmailGenDialog;