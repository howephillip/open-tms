// File: frontend/src/components/common/PageHeader.tsx
import React from 'react';
import { Box, Typography, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface PageHeaderProps {
  title: string;
  searchLabel: string;
  searchTerm: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  children: React.ReactNode; // For action buttons like "New Shipment"
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  searchLabel,
  searchTerm,
  onSearchChange,
  children,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' }, // Column on small screens, row on medium and up
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'center' }, // Align items to the start on small screens
        mb: 2,
        gap: 2, // Adds space between items when they stack or are in a row
      }}
    >
      <Typography variant="h4" component="h1" sx={{ flexShrink: 0 }}>
        {title}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column-reverse', sm: 'row' }, // Stack search below buttons on extra-small screens
          alignItems: 'center',
          gap: 2,
          width: { xs: '100%', md: 'auto' }, // Take full width on small screens
        }}
      >
        <TextField
          label={searchLabel}
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={onSearchChange}
          sx={{ 
            width: { xs: '100%', sm: 'auto' }, // Full width on extra-small screens
            minWidth: { sm: 300 } 
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        {/* This Box will contain the action buttons passed as children */}
        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' }, justifyContent: 'flex-end' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default PageHeader;