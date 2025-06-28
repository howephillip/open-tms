// File: src/components/layout/Layout.tsx

import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Box, CssBaseline, Drawer, Divider,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  LocalShipping as ShippingIcon,
  RequestQuote as QuoteIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon, // Restored Settings Icon
  Calculate as CalculateIcon,
  Close as CloseIcon
} from '@mui/icons-material';
// Ensure Outlet is imported from react-router-dom
import { NavLink, Outlet } from 'react-router-dom';

import RateCalculator from '../common/RateCalculator';

const drawerWidth = 240;

const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleCalculatorToggle = () => setIsCalculatorOpen(!isCalculatorOpen);

  // --- FIX: Restored the full list of navigation items including Settings ---
  const navItems = [
    { text: 'Dashboard', path: '/', icon: <DashboardIcon /> },
    { text: 'Shipments', path: '/shipments', icon: <ShippingIcon /> },
    { text: 'Quotes', path: '/quotes', icon: <QuoteIcon /> },
    { text: 'Carriers', path: '/carriers', icon: <BusinessIcon /> },
    { text: 'Shippers', path: '/shippers', icon: <PeopleIcon /> },
    { text: 'Settings', path: '/settings', icon: <SettingsIcon /> },
  ];

  const drawerContent = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton component={NavLink} to={item.path}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleCalculatorToggle}>
            <ListItemIcon><CalculateIcon /></ListItemIcon>
            <ListItemText primary="Rate Calculator" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">OpenSource TMS</Typography>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }}}>
            {drawerContent}
        </Drawer>
        <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }} open>
            {drawerContent}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        {/* --- FIX: RESTORED THE <OUTLET/> COMPONENT --- */}
        {/* This is the placeholder where your page components will be rendered by the router. */}
        <Outlet />
      </Box>

      {/* The Rate Calculator Drawer */}
      <Drawer
        anchor="right"
        open={isCalculatorOpen}
        onClose={handleCalculatorToggle}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
            <IconButton onClick={handleCalculatorToggle}>
                <CloseIcon />
            </IconButton>
        </Box>
        <Divider />
        <RateCalculator />
      </Drawer>
    </Box>
  );
};

export default Layout;