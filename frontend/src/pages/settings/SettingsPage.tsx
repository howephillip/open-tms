// File: frontend/src/pages/settings/SettingsPage.tsx
import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import DescriptionIcon from '@mui/icons-material/Description';
import PeopleIcon from '@mui/icons-material/People';
import PaletteIcon from '@mui/icons-material/Palette';
import NotificationsIcon from '@mui/icons-material/Notifications';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import PostAddIcon from '@mui/icons-material/PostAdd';
import BuildIcon from '@mui/icons-material/Build'; // For Equipment
import LocalShippingIcon from '@mui/icons-material/LocalShipping'; // For Shipment Form

// Import the actual panel components
import QuoteFormSettingsPanel from './components/QuoteFormSettings';
import ShipmentFormSettingsPanel from './components/ShipmentFormSettings'; // NEW
import AccessorialTypesSettings from './components/AccessorialTypesSettings';
import EquipmentTypesSettings from './components/EquipmentTypesSettings'; // NEW

// Placeholders for other settings panels
const UserManagementPanel: React.FC = () => (<Box p={3}><Typography>User Management UI goes here.</Typography></Box>);
const ThemeSettingsPanel: React.FC = () => (<Box p={3}><Typography>Theme & UI Settings UI goes here.</Typography></Box>);
const NotificationSettingsPanel: React.FC = () => (<Box p={3}><Typography>Notification Settings UI goes here.</Typography></Box>);
const IntegrationsSettingsPanel: React.FC = () => (<Box p={3}><Typography>Integrations & API Keys UI goes here.</Typography></Box>);

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`settings-tabpanel-${index}`} aria-labelledby={`settings-tab-${index}`} {...other}>
      {value === index && (<Box>{children}</Box>)}
    </div>
  );
}

function a11yProps(index: number) {
  return { id: `settings-tab-${index}`, 'aria-controls': `settings-tabpanel-${index}` };
}

const SettingsPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <SettingsIcon sx={{ mr: 1, fontSize: '2.25rem' }} /> Application Settings
      </Typography>
      <Paper elevation={2} sx={{ width: '100%'}}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleChangeTab} aria-label="Settings tabs" variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
            <Tab label="Quote Form" icon={<DescriptionIcon />} iconPosition="start" {...a11yProps(0)} />
            <Tab label="Shipment Form" icon={<LocalShippingIcon />} iconPosition="start" {...a11yProps(1)} />
            <Tab label="Equipment Types" icon={<BuildIcon />} iconPosition="start" {...a11yProps(2)} />
            <Tab label="Accessorials" icon={<PostAddIcon />} iconPosition="start" {...a11yProps(3)} />
            <Tab label="User Management" icon={<PeopleIcon />} iconPosition="start" {...a11yProps(4)} />
            <Tab label="Integrations" icon={<VpnKeyIcon />} iconPosition="start" {...a11yProps(5)} />
          </Tabs>
        </Box>
        <TabPanel value={currentTab} index={0}><QuoteFormSettingsPanel /></TabPanel>
        <TabPanel value={currentTab} index={1}><ShipmentFormSettingsPanel /></TabPanel>
        <TabPanel value={currentTab} index={2}><EquipmentTypesSettings /></TabPanel>
        <TabPanel value={currentTab} index={3}><AccessorialTypesSettings /></TabPanel>
        <TabPanel value={currentTab} index={4}><UserManagementPanel /></TabPanel>
        <TabPanel value={currentTab} index={5}><IntegrationsSettingsPanel /></TabPanel>
      </Paper>
    </Box>
  );
};

export default SettingsPage;