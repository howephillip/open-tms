// File: frontend/src/components/layout/Layout.tsx
import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  IconButton,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  LocalShipping as ShipmentIcon,
  Business as CarrierIcon,
  Store as ShipperIcon,
  AttachMoney as FinancialIcon,
  Description as DocumentIcon,
  Settings as SettingsIcon,
  PriceCheck as LaneRateIcon,
  RequestQuote as QuoteIcon, // Import the Quote icon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

// --- UPDATED MENU ITEMS ---
const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Quotes', icon: <QuoteIcon />, path: '/quotes' }, // Added Quotes
  { text: 'Shipments', icon: <ShipmentIcon />, path: '/shipments' },
  { text: 'Carriers', icon: <CarrierIcon />, path: '/carriers' },
  { text: 'Shippers', icon: <ShipperIcon />, path: '/shippers' },
  { text: 'Lane Rates', icon: <LaneRateIcon />, path: '/lanerates' },
  { text: 'Financials', icon: <FinancialIcon />, path: '/financials' },
  { text: 'Documents', icon: <DocumentIcon />, path: '/documents' },
];

const settingsMenuItem = { text: 'Settings', icon: <SettingsIcon />, path: '/settings' };

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '64px' }}>
        <Typography variant="h6" noWrap component="div">
          OpenSource TMS
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
                navigate(item.path);
                if(isMobile) handleDrawerToggle();
            }}
            selected={location.pathname.startsWith(item.path)} // Simplified selected logic
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem
            button
            key={settingsMenuItem.text}
            onClick={() => {
                navigate(settingsMenuItem.path);
                if(isMobile) handleDrawerToggle();
            }}
            selected={location.pathname.startsWith(settingsMenuItem.path)}
          >
            <ListItemIcon>{settingsMenuItem.icon}</ListItemIcon>
            <ListItemText primary={settingsMenuItem.text} />
          </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            OpenSource TMS
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          marginLeft: { sm: `${drawerWidth}px` }
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;