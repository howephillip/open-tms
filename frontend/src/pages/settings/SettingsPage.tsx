// File: frontend/src/pages/settings/SettingsPage.tsx
import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import DescriptionIcon from '@mui/icons-material/Description'; // For Quote Form tab
import PeopleIcon from '@mui/icons-material/People'; // For User Management tab
import PaletteIcon from '@mui/icons-material/Palette'; // Example for Theme/UI Settings
import NotificationsIcon from '@mui/icons-material/Notifications'; // Example for Notifications
import VpnKeyIcon from '@mui/icons-material/VpnKey'; // Example for API Keys/Integrations
import PostAddIcon from '@mui/icons-material/PostAdd';

// Import the actual panel components
import QuoteFormSettingsPanel from './components/QuoteFormSettings';
import AccessorialTypesSettings from './components/AccessorialTypesSettings';

// Placeholder for other settings panels (you'll create these components later)
const UserManagementPanel: React.FC = () => (
  <Box p={3}>
    <Typography variant="h6">User Management</Typography>
    <Typography>User list, roles, and permissions management will go here.</Typography>
    {/* TODO: Implement actual user management UI */}
  </Box>
);

const ThemeSettingsPanel: React.FC = () => (
  <Box p={3}>
    <Typography variant="h6">Theme & UI Settings</Typography>
    <Typography>Customize application theme, layout preferences, etc.</Typography>
    {/* TODO: Implement theme settings UI */}
  </Box>
);

const NotificationSettingsPanel: React.FC = () => (
  <Box p={3}>
    <Typography variant="h6">Notification Settings</Typography>
    <Typography>Manage email notification preferences, alert settings, etc.</Typography>
    {/* TODO: Implement notification settings UI */}
  </Box>
);

const IntegrationsSettingsPanel: React.FC = () => (
  <Box p={3}>
    <Typography variant="h6">Integrations & API Keys</Typography>
    <Typography>Manage API keys for services like OpenAI, SAFER, etc.</Typography>
    {/* TODO: Implement integrations settings UI */}
  </Box>
);


interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>{children}</Box> // Panels will define their own padding
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

const SettingsPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}> {/* Responsive padding */}
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <SettingsIcon sx={{ mr: 1, fontSize: '2.25rem' }} /> Application Settings
      </Typography>
      <Paper elevation={2} sx={{ width: '100%'}}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={currentTab} 
            onChange={handleChangeTab} 
            aria-label="Settings tabs"
            variant="scrollable" // Allows tabs to scroll on smaller screens
            scrollButtons="auto" // Show scroll buttons if needed
            allowScrollButtonsMobile
          >
            <Tab label="Quote Form" icon={<DescriptionIcon />} iconPosition="start" {...a11yProps(0)} />
            <Tab label="Accessorial Types" icon={<PostAddIcon />} iconPosition="start" {...a11yProps(1)} />
            <Tab label="User Management" icon={<PeopleIcon />} iconPosition="start" {...a11yProps(1)} />
            <Tab label="Theme & UI" icon={<PaletteIcon />} iconPosition="start" {...a11yProps(2)} />
            <Tab label="Notifications" icon={<NotificationsIcon />} iconPosition="start" {...a11yProps(3)} />
            <Tab label="Integrations" icon={<VpnKeyIcon />} iconPosition="start" {...a11yProps(4)} />
            {/* Add more tabs here as needed */}
          </Tabs>
        </Box>
        <TabPanel value={currentTab} index={0}>
          <QuoteFormSettingsPanel />
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          <AccessorialTypesSettings />
       </TabPanel>
        <TabPanel value={currentTab} index={1}>
          <UserManagementPanel />
        </TabPanel>
        <TabPanel value={currentTab} index={2}>
          <ThemeSettingsPanel />
        </TabPanel>
        <TabPanel value={currentTab} index={3}>
          <NotificationSettingsPanel />
        </TabPanel>
        <TabPanel value={currentTab} index={4}>
          <IntegrationsSettingsPanel />
        </TabPanel>
        {/* Add more TabPanel components here corresponding to new Tabs */}
      </Paper>
    </Box>
  );
};

export default SettingsPage;