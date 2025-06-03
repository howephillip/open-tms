// File: frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // Added Navigate
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Typography } from '@mui/material'; // Import Typography for 404

import Layout from './components/layout/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import ShipmentsPage from './pages/shipments/ShipmentsPage';
import ShipmentDetailsView from './pages/shipments/ShipmentDetailsView';
import CarriersPage from './pages/carriers/CarriersPage';
import CarrierDetailsView from './pages/carriers/CarrierDetailsView';
import ShippersPage from './pages/shippers/ShippersPage';
import ShipperDetailsView from './pages/shippers/ShipperDetailsView';
import Financials from './pages/financials/Financials';
import Documents from './pages/documents/Documents';
import SettingsPage from './pages/settings/SettingsPage';
import LaneRatePage from './pages/lanerates/LaneRatePage';
import LaneRateDetailPage from './pages/lanerates/LaneRateDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate replace to="/dashboard" />} /> {/* Navigate from / to /dashboard */}
              <Route path="/dashboard" element={<Dashboard />} />
              
              <Route path="/shipments" element={<ShipmentsPage />} />
              <Route path="/shipments/:shipmentId" element={<ShipmentDetailsView />} />
              <Route path="/shipments/edit/:shipmentId" element={<ShipmentsPage mode="edit" />} />

              <Route path="/carriers" element={<CarriersPage />} />
              <Route path="/carriers/:carrierId" element={<CarrierDetailsView />} />
              {/* Assuming you'll have an edit mode for carriers similar to shipments */}
              {/* <Route path="/carriers/edit/:carrierId" element={<CarriersPage mode="edit" />} /> */}


              <Route path="/shippers" element={<ShippersPage />} />
              <Route path="/shippers/:shipperId" element={<ShipperDetailsView />} />
              {/* Assuming you'll have an edit mode for shippers similar to shipments */}
              {/* <Route path="/shippers/edit/:shipperId" element={<ShippersPage mode="edit" />} /> */}
              
              <Route path="/financials" element={<Financials />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/settings" element={<SettingsPage />} /> {/* Add route for Settings */}
              <Route path="/lanerates" element={<LaneRatePage />} />
              <Route path="/lanerates/detail" element={<LaneRateDetailPage />} />
              
              {/* Basic 404 Not Found route */}
              <Route path="*" element={<Typography variant="h3" sx={{p:3}}>404 - Page Not Found</Typography>} />
            </Routes>
          </Layout>
        </Router>
        <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
        />
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;